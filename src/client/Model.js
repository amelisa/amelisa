let debug = require('debug')('Model')
import uuid from 'uuid'
import { EventEmitter } from 'events'
import CollectionSet from './CollectionSet'
import ClientQuerySet from './ClientQuerySet'
import Subscription from './Subscription'
import { deepClone, isLocalCollection, isServer, parseArguments, parsePath } from '../util'

class Model extends EventEmitter {
  constructor (channel, source, options = {}, projectionHashes = {}) {
    super()
    this.channel = channel
    this.initing = false
    this.inited = false
    this.ready = false
    this.online = false
    this.source = source
    this.options = options
    this.projectionHashes = projectionHashes
    this.collectionSet = new CollectionSet(this)
    this.querySet = new ClientQuerySet(this)
    this.callbacks = {}

    channel.on('message', (message) => {
      debug('message', message)
      this
        .onMessage(message)
        .catch((err) => {
          console.error('Error on processing message', message, err)
        })
    })

    channel.on('open', () => {
      debug('open')
      if (isServer && !this.options.isClient) {
        this.inited = true
        this.setOnline()
        return
      }
      this
        .handshake()
        .catch((err) => {
          console.error('Error while model.handshake', err)
        })
    })

    channel.on('close', () => {
      debug('close')
      this.onChannelClose()
    })

    channel.on('error', () => {
      debug('error')
      this.onChannelClose()
    })
  }

  onChannelClose () {
    debug('onChannelClose', this.inited, this.online)
    if (!this.inited && !this.initing) {
      this
        .init()
        .catch((err) => {
          console.error('Error while model.init', err, err.stack)
        })
    } else if (this.online) {
      this.setOffline()
    }
  }

  async init () {
    debug('init')
    this.initing = true

    this.storage = this.getStorage && this.getStorage()

    if (this.storage) {
      await this.storage.init()

      await this.collectionSet.fillFromClientStorage()
    }

    this.set('_session.online', false)

    let source = this.get('_app.source')
    if (!source) {
      source = this.id()
      this.source = source
      this.set('_app.source', source)
    } else {
      this.source = source
    }

    this.inited = true
    this.setReady()
  }

  async handshake () {
    debug('handshake')
    this.initing = true

    let start = Date.now()
    let op = {
      id: this.id(),
      type: 'handshake'
    }
    let { collectionNames, date, projectionHashes, version } = await this.send(op, true)
    this.syncDate(start, date)

    collectionNames = collectionNames.concat(['_app', '_session'])
    this.storage = this.getStorage && this.getStorage(collectionNames, version)

    if (this.storage) {
      await this.storage.init()

      await this.onProjections(projectionHashes)

      await this.collectionSet.fillFromClientStorage()
    }

    if (version !== this.get('_app.version')) this.emit('version', version)
    this.set('_app.version', version)

    let source = this.get('_app.source')
    if (!source) {
      source = this.id()
      this.source = source
      this.set('_app.source', source)
    } else {
      this.source = source
    }

    await this.unbundleData()

    op = {
      id: this.id(),
      type: 'sync',
      value: {
        collections: this.collectionSet.getSyncData(),
        queries: this.querySet.getSyncData()
      }
    }
    await this.send(op, true)

    this.inited = true
    this.setOnline()
    this.setReady()
  }

  async onReady () {
    if (this.ready) return

    return new Promise((resolve, reject) => {
      this.once('ready', () => {
        resolve()
      })
    })
  }

  async fetch (...rawSubscribes) {
    let subscription = new Subscription(rawSubscribes, this.collectionSet, this.querySet)
    await subscription.fetch()

    return subscription
  }

  async subscribe (...rawSubscribes) {
    if (this.options.fetchOnly) return this.fetch(...rawSubscribes)

    let subscription = new Subscription(rawSubscribes, this.collectionSet, this.querySet)
    await subscription.subscribe()

    return subscription
  }

  setReady () {
    this.ready = true
    this.emit('ready')
  }

  async setOnline () {
    this.online = true

    this.set('_session.online', true)
    this.emit('online')
  }

  setOffline () {
    this.online = false
    this.set('_session.online', false)
    this.emit('offline')
  }

  async onMessage (message) {
    let { type, collectionName, docId, expression, value, version, diffs, docOps, ops, ackId, error } = message
    let doc
    let query
    let collection

    switch (type) {
      case 'fetch':
        doc = this.collectionSet.getDoc(collectionName, docId)
        if (doc) {
          doc.onFetched(version, ops)
        }
        break

      case 'sub':
        doc = this.collectionSet.getDoc(collectionName, docId)
        if (doc) {
          doc.onSubscribed(version, ops)
        }
        break

      case 'q':
        query = this.querySet.getOrCreateQuery(collectionName, expression)
        query.onSnapshotNotDocs(value)
        break

      case 'qdiff':
        query = this.querySet.getOrCreateQuery(collectionName, expression)
        query.onDiff(diffs, docOps)
        break

      case 'add':
      case 'set':
      case 'del':
        collection = this.collectionSet.getOrCreateCollection(collectionName)
        doc = collection.getDoc(docId)

        if (doc) {
          doc.receiveOp(message)
        } else {
          collection.attach(docId, [message])
        }
        break

      default:
    }

    if (ackId) {
      if (error) this.collectionSet.rejectOp(collectionName, docId, ackId)

      let callbacks = this.callbacks[ackId]
      if (callbacks) {
        delete this.callbacks[ackId]
        for (let callback of callbacks) {
          if (error) {
            callback(new Error(error))
          } else {
            callback(null, value)
          }
        }
      }
    }
  }

  get () {
    let [collectionName, docId, field] = parseArguments(arguments)
    return this.collectionSet.get(collectionName, docId, field)
  }

  async add (collectionName, docData) {
    if (!collectionName) return console.error('Model.add collectionName is required')
    if (typeof collectionName !== 'string') return console.error('Model.add collectionName should be a string')
    if (!docData) return console.error('Model.add docData is required')
    if (typeof docData !== 'object') return console.error('Model.add docData should be an object')

    docData = deepClone(docData)
    let docId = docData._id
    if (!docId) docId = this.id()
    else delete docData._id

    let collection = this.collectionSet.getOrCreateCollection(collectionName)
    return collection.add(docId, docData)
  }

  async set (path, value) {
    let [collectionName, docId, field] = parsePath(path)

    if (!collectionName) return console.error('Model.set collectionName is required')
    if (typeof collectionName !== 'string') return console.error('Model.set collectionName should be a string')
    if (!docId) return console.error('Model.set docId is required')
    if (typeof docId !== 'string') return console.error('Model.set docId should be a string')
    if (field && typeof field !== 'string') return console.error('Model.set field should be a string')

    let doc = this.collectionSet.getOrCreateDoc(collectionName, docId)

    return doc.set(field, value)
  }

  async del (...path) {
    let [collectionName, docId, field] = parsePath(path)

    if (!collectionName) return console.error('Model.del collectionName is required')
    if (typeof collectionName !== 'string') return console.error('Model.del collectionName should be a string')
    if (!docId) return console.error('Model.del docId is required')
    if (typeof docId !== 'string') return console.error('Model.del docId should be a string')
    if (field && typeof field !== 'string') return console.error('Model.del field should be a string')

    let doc = this.collectionSet.getOrCreateDoc(collectionName, docId)

    return doc.del(field)
  }

  doc (collectionName, docId) {
    return this.collectionSet.getOrCreateDoc(collectionName, docId)
  }

  query (collectionName, expression) {
    return this.querySet.getOrCreateQuery(collectionName, expression)
  }

  async onProjections (newProjectionHashes) {
    let prevProjectionHashes = this.get('_app.projectionHashes')

    let collectionNames = this.getCollectionNamesToClear(prevProjectionHashes, newProjectionHashes)

    if (!this.storage) return
    return Promise.all(collectionNames.map((collectionName) => this.storage.clearCollection(collectionName)))
  }

  getCollectionNamesToClear (prevProjectionHashes, newProjectionHashes) {
    let collectionNames = []

    for (let collectionName in prevProjectionHashes) {
      if (collectionName === '_id') continue

      let hash = prevProjectionHashes[collectionName]
      let newHash = newProjectionHashes[collectionName]

      if (!newHash || hash !== newHash) {
        collectionNames.push(collectionName)
      }
    }

    return collectionNames
  }

  async send (message, forceSend) {
    debug('send', message, forceSend, this.inited, this.online, !!message.id)
    if (!forceSend && (!this.inited || !this.online || !message.id)) return

    return new Promise((resolve, reject) => {
      let callback = (err, value) => {
        if (err) return reject(err)

        resolve(value)
      }
      let callbacks = this.callbacks[message.id]
      if (!callbacks) callbacks = this.callbacks[message.id] = []
      callbacks.push(callback)

      try {
        this.channel.send(message)
      } catch (err) {
        console.error('Error while sending message', message, err)
        // TODO: probably we should not reject here
        reject(err)
      }
    })
  }

  createOp (opData) {
    let date = this.date()
    if (this.lastOpDate && this.lastOpDate >= date) date = this.lastOpDate + 1
    this.lastOpDate = date

    let op = {
      id: this.id(),
      source: this.source,
      date
    }

    return Object.assign({}, opData, op)
  }

  async sendOp (opData) {
    // debug('sendOp', opData)
    let op = this.createOp(opData)

    return this.send(op)
  }

  syncDate (start, serverDate) {
    if (!serverDate) return
    // TODO: could it be better?
    let end = Date.now()
    let requestTime = end - start
    let serverNow = serverDate - (requestTime / 2)
    let dateDiff = serverNow - end
    this.set('_app.dateDiff', dateDiff)
  }

  date () {
    return Date.now() + (this.get('_app.dateDiff') || 0)
  }

  id () {
    return uuid.v4()
  }

  close () {
    this.channel.close()
    if (this.storage && this.storage.close) this.storage.close()
  }

  destroy () {
    this.close()
  }

  bundleJsonFromDom () {
    if (!this.getBundleJsonFromDom) return JSON.stringify({collections: {}})

    try {
      return this.getBundleJsonFromDom()
    } catch (err) {
      console.error('Error while reading bundle from dom', err)
      return JSON.stringify({collections: {}})
    }
  }

  getBundleJson () {
    if (!isServer) return this.bundleJsonFromDom()

    let bundle = {
      collections: this.collectionSet.bundle()
    }

    let json = JSON.stringify(bundle)
    json = json && json.replace(/<\//g, '<\\/')
    return json
  }

  async unbundleData () {
    if (this.onBundleReady) await this.onBundleReady()
    if (!this.getBundleJsonFromDom) return
    let json = this.bundleJsonFromDom()
    let bundle = JSON.parse(json)
    this.collectionSet.unbundle(bundle.collections)
  }

  prepareBundle () {
    let options = this.options
    let state = this.collectionSet.get()
    for (let collectionName in state) {
      let collectionOptions = options.collections[collectionName]
      if (!isLocalCollection(collectionName) && (!collectionOptions || !collectionOptions.client)) {
        this.collectionSet.clearCollection(collectionName)
      }
    }
  }
}

export default Model
