import { EventEmitter } from 'events'
import ChannelSession from './ChannelSession'
import Projection from './Projection'
import ServerDocSet from './ServerDocSet'
import ServerQuerySet from './ServerQuerySet'
import ServerChannel from './ServerChannel'
import ServerSocketChannel from './ServerSocketChannel'
import Model from '../client/Model'
import { arrayRemove } from '../util'

const defaultOptions = {
  collections: {},
  projections: {},
  source: 'server',
  unattachTimeout: 5000,
  saveDebounceTimeout: 1000,
  cuttingOpsCount: 100,
  cuttingTimeout: 2000
}

class Store extends EventEmitter {
  constructor (storage, pubsub, options = {}) {
    super()
    this.storage = storage
    this.pubsub = pubsub
    this.options = Object.assign({}, defaultOptions, options)
    this.docSet = new ServerDocSet(this)
    this.querySet = new ServerQuerySet(this)
    this.clients = []
    this.projections = {}
    this.clientCollectionNames = []
    this.projectionHashes = {}
    this.sentOps = {}

    if (pubsub) pubsub.on('message', this.onPubsubOp.bind(this))

    for (let collectionName in this.options.collections) {
      let collectionOptions = this.options.collections[collectionName]
      if (collectionOptions.client) this.clientCollectionNames.push(collectionName)
    }

    for (let collectionName in this.options.projections) {
      let projectionOptions = this.options.projections[collectionName]
      let projection = new Projection(collectionName,
        projectionOptions.collectionName, projectionOptions.fields)
      this.projections[collectionName] = projection
      this.projectionHashes[collectionName] = projection.getHash()
    }
  }

  init () {
    return Promise.all([this.storage.init(), this.pubsub ? this.pubsub.init() : Promise.resolve()])
  }

  createModel (options) {
    let channel = new ServerChannel()
    let channel2 = new ServerChannel()
    channel.pipe(channel2).pipe(channel)
    let modelOptions = Object.assign({}, this.options, options)
    let model = new Model(channel, this.options.source, modelOptions, this.projectionHashes)
    model.server = true

    this.onChannel(channel2)
    channel.open()

    return model
  }

  connectModel (model) {
    let { channel } = model
    let channel2 = new ServerChannel()
    channel.pipe(channel2).pipe(channel)

    this.onChannel(channel2)
    channel.open()
  }

  onConnection = (socket) => {
    let channel = new ServerSocketChannel(socket, socket.upgradeReq)
    this.onChannel(channel)
  };

  onChannel = (channel) => {
    channel._session = new ChannelSession()
    this.clients.push(channel)

    channel.on('message', (message) => {
      this.onMessage(message, channel)
        .catch((err) => {
          let { id, collectionName, docId } = message
          let op = {
            ackId: id,
            collectionName,
            docId,
            error: 'Internal Error'
          }
          this.sendOp(op, channel)

          console.trace('onMessage error', err)
        })
    })

    channel.on('close', () => {
      arrayRemove(this.clients, channel)
      this.docSet.channelClose(channel)
      this.querySet.channelClose(channel)
    })

    channel.on('error', (err) => {
      console.trace('channel error', err)
    })

    this.emit('channel', channel)
  };

  async onMessage (message, channel) {
    let { type, id, collectionName, docId, expression, value, version, docIds, ops, opsType } = message
    let doc
    let query
    let op

    if (this.preHook) {
      let { session, params } = this.getHookParams(channel)

      try {
        await this.preHook(message, session, params)
      } catch (err) {
        let op = {
          ackId: id,
          collectionName,
          docId,
          error: err && err.message
        }
        return this.sendOp(op, channel)
      }
    }

    switch (type) {
      case 'handshake':
        op = {
          type: 'handshake',
          ackId: id,
          value: {
            collectionNames: this.clientCollectionNames,
            date: Date.now(),
            projectionHashes: this.projectionHashes,
            version: this.options.version
          }
        }
        this.sendOp(op, channel)
        break

      case 'sync':
        let syncData = value
        let docPromises = []

        for (let collectionName in syncData.collections) {
          let collectionSyncData = syncData.collections[collectionName]
          for (let docId in collectionSyncData) {
            let { ops, version } = collectionSyncData[docId]
            let docPromise = this.docSet
              .getOrCreateDoc(collectionName, docId)
              .then((doc) => {
                for (let op of ops) {
                  doc.onOp(op, channel)

                  doc.once('saved', () => {
                    this.onOp(op)
                  })
                }
                doc.subscribe(channel, version)
              })
            docPromises.push(docPromise)
          }
        }

        await Promise.all(docPromises)

        let queryPromises = []

        for (let hash in syncData.queries) {
          let { collectionName, expression, docIds } = syncData.queries[hash]
          let queryPromise = this.querySet
            .getOrCreateQuery(collectionName, expression)
            .then((query) => {
              query.subscribe(channel, docIds)
            })
          queryPromises.push(queryPromise)
        }
        await Promise.all(queryPromises)

        op = {
          type: 'sync',
          ackId: id
        }
        this.sendOp(op, channel)
        break

      case 'fetch':
        doc = await this.docSet.getOrCreateDoc(collectionName, docId)
        doc.fetch(channel, version, id)
        break

      case 'qfetch':
        query = await this.querySet.getOrCreateQuery(collectionName, expression)
        query.fetch(channel, docIds, id)
        break

      case 'sub':
        doc = await this.docSet.getOrCreateDoc(collectionName, docId)
        doc.subscribe(channel, version, id)
        break

      case 'unsub':
        doc = await this.docSet.getOrCreateDoc(collectionName, docId)
        doc.unsubscribe(channel)
        break

      case 'qsub':
        query = await this.querySet.getOrCreateQuery(collectionName, expression)
        query.subscribe(channel, docIds, id)
        break

      case 'qunsub':
        query = await this.querySet.getOrCreateQuery(collectionName, expression)
        query.unsubscribe(channel)
        break

      case 'ops':
        doc = await this.docSet.getOrCreateDoc(collectionName, docId)
        doc.applyOps(ops, opsType)
        doc.save()
        doc.broadcastOp(message, channel)

        doc.once('saved', () => {
          op = {
            ackId: id
          }
          this.sendOp(op, channel)
          this.onOp(message)
        })
        break

      case 'add':
      case 'set':
      case 'del':
      case 'push':
      case 'unshift':
      case 'pop':
      case 'shift':
      case 'insert':
      case 'remove':
      case 'move':
      case 'arraySet':
      case 'invert':
      case 'increment':
      case 'stringInsert':
      case 'stringRemove':
      case 'stringSet':
        doc = await this.docSet.getOrCreateDoc(collectionName, docId)
        doc.onOp(message, channel)

        // FIXME: remove listener if reject
        doc.once('saved', () => {
          op = {
            ackId: id
          }
          this.sendOp(op, channel)
          this.onOp(message)
        })

        let { session, params } = this.getHookParams(channel)
        if (this.afterHook) {
          try {
            await this.afterHook(message, session, params)
          } catch (err) {
            this.onAfterHookError(err, message, session, params)
            return
          }
        }
        break

      default:
    }
  }

  onAfterHookError (err) {
    console.trace('afterHook error', err)
  }

  getHookParams (channel) {
    let { req, server } = channel
    let session = req ? req.session : undefined
    let params = {
      server
    }

    return {
      session,
      params
    }
  }

  onOp (op) {
    this.querySet.onOp(op)
    this.docSet.onOp(op)
    this.sentOps[op.id] = true
    if (this.pubsub) this.pubsub.send(op)
  }

  onPubsubOp (op) {
    if (this.sentOps[op.id]) {
      delete this.sentOps[op.id]
      return
    }
    this.querySet.onOp(op)
    this.docSet.onPubsubOp(op)
  }

  sendOp (op, channel) {
    try {
      channel.send(op)
    } catch (err) {
      console.trace('Store.sendOp error', err)
    }
  }

  modelMiddleware () {
    let store = this
    function modelMiddleware (req, res, next) {
      let requestTimeout = req.socket.server.timeout
      let model

      function getModel () {
        if (model) return model
        model = store.createModel({fetchOnly: true}, req)
        return model
      }
      req.getModel = getModel

      function closeModel () {
        req.getModel = () => {}
        res.removeListener('finish', closeModel)
        res.removeListener('close', closeModel)
        model && model.close()
        model = null
      }
      function closeModelAfterTimeout () {
        setTimeout(closeModel, requestTimeout)
      }
      res.on('finish', closeModel)
      res.on('close', closeModelAfterTimeout)

      next()
    }
    return modelMiddleware
  }
}

export default Store
