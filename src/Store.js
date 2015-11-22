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
    options.preloads = options.preloads || []
    options.projectionHashes = options.projectionHashes || {}
    this.options = options
    this.source = options.source || 'server'
    this.docSet = new ServerDocSet(this, storage)
    this.querySet = new ServerQuerySet(this, storage)
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

  createModel () {
    let channel = new ServerChannel()
    let channel2 = new ServerChannel()
    channel.pipe(channel2).pipe(channel)
    let model = new Model(channel, this.source, null, this.options)
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
    })

    channel.on('close', () => {
      debug('close')
      util.arrayRemove(this.clients, channel)
      this.docSet.channelClose(channel)
      this.querySet.channelClose(channel)
    })

    channel.on('error', (err) => {
      debug('error', err)
    })

    this.emit('channel', channel)
  }

  validateMessage (message, channel) {
    if (this.hook) {
      let { req, server } = channel
      let session = req ? req.session : undefined
      let params = {
        server: server
      }
      this.hook(message, session, params, (err) => {
        if (err) {
          let op = {
            id: message.id,
            type: 'ack',
            collectionName: message.collectionName,
            docId: message.docId,
            error: err
          }
          this.sendOp(op, channel)
        } else {
          this.onMessage(message, channel)
        }
      })
    } else {
      this.onMessage(message, channel)
    }
  }

  onMessage (message, channel) {
    let { type, id, collectionName, docId, expression, value, version } = message
    let op

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
        this.docSet
          .getOrCreateDoc(collectionName, docId)
          .then((doc) => {
            doc.fetch(channel, id)
          })
        break

      case 'qfetch':
        this.querySet
          .getOrCreateQuery(collectionName, expression)
          .then((query) => {
            query.fetch(channel, id)
          })
        break

      case 'sub':
        this.docSet
          .getOrCreateDoc(collectionName, docId)
          .then((doc) => {
            doc.subscribe(channel, version, id)
          })
        break

      case 'unsub':
        this.docSet
          .getOrCreateDoc(collectionName, docId)
          .then((doc) => {
            doc.unsubscribe(channel)
          })
        break

      case 'qsub':
        this.querySet
          .getOrCreateQuery(collectionName, expression)
          .then((query) => {
            query.subscribe(channel, id)
          })
        break

      case 'qunsub':
        this.querySet
          .getOrCreateQuery(collectionName, expression)
          .then((query) => {
            query.unsubscribe(channel)
          })
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

                if (version !== undefined) {
                  doc.subscribeWithoutSending(channel, version)
                }

                let data = {
                  collectionName,
                  docId,
                  ops: doc.getOpsToSend(version),
                  version: doc.version()
                }
                return data
              })
            docPromises.push(docPromise)
          }
        }

        let queryPromises = []

        for (let hash in syncData.queries) {
          let querySyncData = syncData.queries[hash]
          let { collectionName, expression } = querySyncData
          let queryPromise = this.querySet
            .getOrCreateQuery(collectionName, expression)
            .then((query) => {
              let data = {
                collectionName,
                expression,
                data: query.data
              }

              return data
            })
          queryPromises.push(queryPromise)
        }

        let preloadPromises = []

        for (let preload of this.options.preloads) {
          let [collectionName, expression] = preload
          if (typeof expression !== 'object') continue
          let preloadPromise = this.querySet
            .getOrCreateQuery(collectionName, expression)
            .then((query) => {
              let data = {
                collectionName,
                expression,
                data: query.data
              }

              return data
            })
          preloadPromises.push(preloadPromise)
        }

        Promise
          .all([
            Promise.all(docPromises),
            Promise.all(queryPromises),
            Promise.all(preloadPromises)
          ])
          .then((data) => {
            let op = {
              type: 'sync',
              value: {
                version: this.options.version,
                projectionHashes: this.options.projectionHashes,
                docs: data[0],
                queries: data[1],
                preloads: data[2]
              }
            }
            this.sendOp(op, channel)
          })
        break

      case 'add':
      case 'set':
      case 'del':
        this.docSet
          .getOrCreateDoc(collectionName, docId)
          .then((doc) => {
            doc.onOp(message, channel)

            // FIXME: remove listener if reject
            doc.once('saved', () => {
              op = {
                id: id,
                type: 'ack'
              }
              this.sendOp(op, channel)
              this.onOp(message)
            })
          })
        break

      default:
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
    // debug('sendOp', op.type)

    if (op.type === 'q' && Array.isArray(op.value)) {
      for (let docData of op.value) {
        this.docSet
          .getOrCreateDoc(op.collectionName, docData._id)
          .then((doc) => {
            doc.subscribe(channel, docData._v)
          })
      }
    }

    if (op.type === 'qdiff') {
      for (let diff of op.value) {
        if (diff.type === 'insert') {
          for (let docData of diff.values) {
            this.docSet
              .getOrCreateDoc(op.collectionName, docData._id)
              .then((doc) => {
                doc.subscribe(channel, docData._v)
              })
          }
        }
      }
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