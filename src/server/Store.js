import { EventEmitter } from 'events'
import eventToPromise from 'event-to-promise'
import invariant from 'invariant'
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
  saveDebounceTimeout: 100,
  cuttingOpsCount: 100,
  cuttingTimeout: 2000,
  saveOps: true
}

class Store extends EventEmitter {
  constructor (options = {}) {
    super()
    let { storage, opsStorage, pubsub, createSchema } = options
    invariant(storage, 'Store.constructor storage is required for creating store')
    this.storage = storage
    this.opsStorage = storage || opsStorage
    this.pubsub = pubsub
    this.createSchema = createSchema
    this.dbQueries = storage.getDbQueries()
    this.options = {...defaultOptions, ...options}
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
    let model = new Model({
      ...this.options,
      ...options,
      channel,
      dbQueries: this.dbQueries,
      createSchema: this.createSchema,
      projectionHashes: this.projectionHashes
    })
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

  onConnection = async (socket) => {
    let channel = new ServerSocketChannel(socket, socket.upgradeReq)

    if (this.clientHook) {
      let { session, params } = this.getHookParams(channel)

      try {
        await this.clientHook(channel, session, params)
      } catch (err) {
        console.trace('clientHook error', err)
        return
      }
    }

    this.onChannel(channel)
  }

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
  }

  async onDocOps (ackId, collectionName, docId, field, newOps, channel, opsType, index, howMany) {
    let doc = await this.docSet.getOrCreateDoc(collectionName, docId)

    let ops = []
    let prevs = []
    for (let op of newOps) {
      let valid = await this.validateOp(op, channel)
      if (!valid) continue

      doc.onOpsOp(op, channel)
      ops.push(op)
      let prev = this.getPrev(op, doc)
      prevs.push(prev)
    }

    let op = {
      id: Model.prototype.id(),
      type: 'ops',
      collectionName,
      docId,
      ops,
      opsType,
      index,
      howMany
    }
    if (field) op.field = field

    doc.broadcastOp(op, channel)

    doc.save()

    await eventToPromise(doc, 'saved')

    if (ackId) this.sendAckOp(ackId, channel)
    this.onOp(op)

    for (let i = 0; i < ops.length; i++) {
      let op = ops[i]
      let prev = prevs[i]
      this.afterOp(op, channel, prev)
    }

    return doc
  }

  async validateOp (op, channel) {
    let { id, collectionName, docId } = op

    if (this.preHook) {
      let { session, params } = this.getHookParams(channel)

      try {
        await this.preHook(op, session, params)
        return true
      } catch (err) {
        let op = {
          ackId: id,
          collectionName,
          docId,
          error: err && err.message
        }
        this.sendOp(op, channel)
        return false
      }
    }

    return true
  }

  async afterOp (op, channel, prev) {
    let { session, params } = this.getHookParams(channel, prev)

    if (this.afterHook) {
      try {
        await this.afterHook(op, session, params)
      } catch (err) {
        this.onAfterHookError(err, op, session, params)
      }
    }
  }

  getPrev (op, doc) {
    if (op.type !== 'del') return

    return doc.get(op.field)
  }

  async onMessage (message, channel) {
    let { type, id, collectionName, docId, field, expression, value, version,
      docIds, ops, opsType, index, howMany } = message
    let doc
    let query
    let valid

    switch (type) {
      case 'handshake':
        let op = {
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
            let docPromise

            if (ops.length) {
              docPromise = this
                .onDocOps(null, collectionName, docId, null, ops, channel)
                .then((doc) => doc.subscribe(channel, version))
            } else {
              docPromise = this.docSet
                .getOrCreateDoc(collectionName, docId)
                .then((doc) => doc.subscribe(channel, version))
            }

            docPromises.push(docPromise)
          }
        }

        await Promise.all(docPromises)

        let queryPromises = []

        for (let hash in syncData.queries) {
          let { collectionName, expression, docIds } = syncData.queries[hash]
          let queryPromise = this.querySet
            .getOrCreateQuery(collectionName, expression)
            .then((query) => query.subscribe(channel, docIds))
          queryPromises.push(queryPromise)
        }
        await Promise.all(queryPromises)

        this.sendAckOp(id, channel)
        break

      case 'fetch':
        valid = await this.validateOp(message, channel)
        if (!valid) break

        doc = await this.docSet.getOrCreateDoc(collectionName, docId)
        doc.fetch(channel, version, id)
        break

      case 'qfetch':
        valid = await this.validateOp(message, channel)
        if (!valid) break

        query = await this.querySet.getOrCreateQuery(collectionName, expression)
        query.fetch(channel, docIds, id)
        break

      case 'sub':
        valid = await this.validateOp(message, channel)
        if (!valid) break

        doc = await this.docSet.getOrCreateDoc(collectionName, docId)
        doc.subscribe(channel, version, id)
        break

      case 'qsub':
        valid = await this.validateOp(message, channel)
        if (!valid) break

        query = await this.querySet.getOrCreateQuery(collectionName, expression)
        query.subscribe(channel, docIds, id)
        break

      case 'unsub':
        doc = await this.docSet.getOrCreateDoc(collectionName, docId)
        doc.unsubscribe(channel)
        break

      case 'qunsub':
        query = await this.querySet.getOrCreateQuery(collectionName, expression)
        query.unsubscribe(channel)
        break

      case 'ops':
        await this.onDocOps(id, collectionName, docId, field, ops, channel, opsType, index, howMany)
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
      case 'swap':
      case 'arraySet':
      case 'invert':
      case 'increment':
      case 'stringInsert':
      case 'stringRemove':
      case 'stringSet':
      case 'rich':
        valid = await this.validateOp(message, channel)
        if (!valid) break

        doc = await this.docSet.getOrCreateDoc(collectionName, docId)
        let prev = this.getPrev(message, doc)
        doc.onOp(message, channel)

        await eventToPromise(doc, 'saved')

        this.sendAckOp(id, channel)
        this.onOp(message)

        this.afterOp(message, channel, prev)
        break
    }
  }

  onAfterHookError (err) {
    console.trace('afterHook error', err)
  }

  getHookParams (channel, prev) {
    let { req, server } = channel
    let session = req ? req.session : undefined
    let params = {
      prev,
      server
    }

    return {
      session,
      params
    }
  }

  sendAckOp (ackId, channel) {
    let ackOp = {
      ackId
    }
    this.sendOp(ackOp, channel)
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
    channel.send(op)
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
