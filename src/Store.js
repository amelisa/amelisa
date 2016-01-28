let debug = require('debug')('Store')
import { EventEmitter } from 'events'
import ChannelSession from './ChannelSession'
import Projection from './Projection'
import ServerDocSet from './ServerDocSet'
import ServerQuerySet from './ServerQuerySet'
import ServerChannel from './ServerChannel'
import Model from './Model'
import util from './util'

class Store extends EventEmitter {
  constructor (storage, redis, pubsub, options = {}) {
    super()
    this.storage = storage
    this.redis = redis
    this.pubsub = pubsub
    options.collections = options.collections || {}
    options.projectionHashes = options.projectionHashes || {}
    this.options = options
    this.source = options.source || 'server'
    this.docSet = new ServerDocSet(this)
    this.querySet = new ServerQuerySet(this)
    this.clients = []
    this.projections = {}
    this.sentOps = {}

    if (pubsub) pubsub.on('message', this.onPubSubOp.bind(this))

    if (options.projections) {
      for (let collectionName in options.projections) {
        let projectionOptions = options.projections[collectionName]
        let projection = new Projection(collectionName,
          projectionOptions.collectionName, projectionOptions.fields)
        this.projections[collectionName] = projection
        options.projectionHashes[collectionName] = projection.getHash()
      }
    }
  }

  createModel (options) {
    let channel = new ServerChannel()
    let channel2 = new ServerChannel()
    channel.pipe(channel2).pipe(channel)
    let model = new Model(channel, this.source, Object.assign({}, this.options, options))
    model.server = true

    model.setOnline()
    this.onChannel(channel2)

    return model
  }

  onChannel (channel) {
    debug('onChannel', channel.server)
    channel._session = new ChannelSession()
    this.clients.push(channel)

    channel.on('message', (message) => {
      // debug('message', message)
      this.validateMessage(message, channel)
        .catch((err) => console.error('validateMessage error', err, err.stack))
    })

    channel.on('close', () => {
      debug('close', this.clients.length)
      util.arrayRemove(this.clients, channel)
      this.docSet.channelClose(channel)
      this.querySet.channelClose(channel)
    })

    channel.on('error', (err) => {
      debug('error', err)
    })

    this.emit('channel', channel)
  }

  async validateMessage (message, channel) {
    if (this.hook) {
      let { session, params } = this.getHookParams(channel)

      try {
        await this.hook(message, session, params)
      } catch (err) {
        let op = {
          id: message.id,
          type: 'ack',
          collectionName: message.collectionName,
          docId: message.docId,
          error: err
        }
        return this.sendOp(op, channel)
      }
    }

    await this.onMessage(message, channel)
  }

  async onMessage (message, channel) {
    debug('onMessage', message.type)
    let { type, id, collectionName, docId, expression, value, version } = message
    let doc
    let query

    debug(type, id, collectionName, docId, expression)

    switch (type) {
      case 'date':
        this.sendOp({
          id: id,
          type: 'ackdate',
          value: Date.now()
        }, channel)
        break

      case 'fetch':
        doc = await this.docSet.getOrCreateDoc(collectionName, docId)
        doc.fetch(channel, id)
        break

      case 'qfetch':
        query = await this.querySet.getOrCreateQuery(collectionName, expression)
        query.fetch(channel, id)
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
        query.subscribe(channel, id)
        break

      case 'qunsub':
        query = await this.querySet.getOrCreateQuery(collectionName, expression)
        query.unsubscribe(channel)
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
                  doc.onOp(op)
                  this.onOp(op)
                }

                doc.subscribe(channel, version, 'id')
              })
            docPromises.push(docPromise)
          }
        }

        await Promise.all(docPromises)

        let queryPromises = []

        for (let hash in syncData.queries) {
          let querySyncData = syncData.queries[hash]
          let { collectionName, expression } = querySyncData
          let queryPromise = this.querySet
            .getOrCreateQuery(collectionName, expression)
            .then((query) => {
              query.subscribe(channel, 'id')
            })
          queryPromises.push(queryPromise)
        }
        await Promise.all(queryPromises)

        let op = {
          type: 'sync',
          value: {
            version: this.options.version,
            projectionHashes: this.options.projectionHashes
          }
        }
        this.sendOp(op, channel)
        break

      case 'add':
      case 'set':
      case 'del':
        doc = await this.docSet.getOrCreateDoc(collectionName, docId)
        doc.onOp(message, channel)

        let { session, params } = this.getHookParams(channel)
        if (this.afterHook) this.afterHook(message, session, params)

        // FIXME: remove listener if reject
        doc.once('saved', () => {
          op = {
            id: id,
            type: 'ack'
          }
          this.sendOp(op, channel)
          this.onOp(message)
        })
        break

      default:
    }
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
    if (this.redis) this.redis.send(op)
  }

  onPubSubOp (op) {
    if (this.sentOps[op.id]) {
      delete this.sentOps[op.id]
      return
    }
    this.querySet.onOp(op)
    this.docSet.onOp(op)
  }

  sendOp (op, channel) {
    debug('sendOp', op.type)

    try {
      this.send(op, channel)
    } catch (err) {
      console.error('sendOp', err)
    }
  }

  async send (op, channel) {
    if ((op.type === 'q' || op.type === 'qdiff') && op.docs) {
      let docPromises = []
      for (let docId in op.docs) {
        let docData = op.docs[docId]
        let docPromise = this.docSet
          .getOrCreateDoc(op.collectionName, docData._id)
          .then((doc) => {
            doc.subscribe(channel, docData._v)
          })
        docPromises.push(docPromise)
      }
      await Promise.all(docPromises)
    }

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
