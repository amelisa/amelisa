let debug = require('debug')('Model')
import uuid from 'uuid'
import { EventEmitter } from 'events'
import CollectionSet from './CollectionSet'
import ClientQuerySet from './ClientQuerySet'
import Subscription from './Subscription'
import { getBundleJsonFromDom } from '../web/dom'
import { deepClone, isLocalCollection, isServer, parseArguments, parsePath } from '../util'

class Model extends EventEmitter {
  constructor (channel, source, options = {}, projectionHashes = {}) {
    super()
    this.channel = channel
    this.online = false
    this.source = source
    this.options = options
    this.projectionHashes = projectionHashes
    this.collectionSet = new CollectionSet(this)
    this.querySet = new ClientQuerySet(this)
    this.callbacks = {}
    this.dateDiff = 0

    channel.on('message', (message) => {
      debug('message', message)
      this.onMessage(message)
        .catch((err) => {
          console.error('Error on processing message', message, err)
        })
    })

    channel.on('open', () => {
      debug('open')
      if (!this.online) this.setOnline()
    })

    channel.on('close', () => {
      debug('close')
      if (this.online) this.setOffline()
    })

    channel.on('error', (err) => {
      console.error('Connection error', err)
      if (this.online) this.setOffline()
    })

    this.once('online', () => {
      this.ready = true
      this.emit('ready')
    })
  }

  async ready () {
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

  async setOnline () {
    this.online = true

    if (!isServer) await this.syncDate()

    let syncData = {
      collections: this.collectionSet.getSyncData(),
      queries: this.querySet.getSyncData()
    }
    this.sendOp({
      type: 'sync',
      value: syncData
    })

    this.set('_session.online', true)
    this.emit('online')
  }

  setOffline () {
    this.online = false
    this.set('_session.online', false)
    this.emit('offline')
  }

  async onMessage (message) {
    let { type, id, collectionName, docId, expression, value, version, diffs, docIds, docOps, ops, ackId, error } = message
    let doc
    let query
    let collection

    debug('onMessage', this.source, type, id, collectionName, docId, expression, value, diffs)

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
        if (query.isDocs) {
          query.onSnapshotDocs(docIds, docOps, version)
        } else {
          query.onSnapshotNotDocs(value, version)
        }
        break

      case 'qdiff':
        query = this.querySet.getOrCreateQuery(collectionName, expression)
        query.onDiff(diffs, docOps, version)
        break

      case 'sync':
        await this.onProjections(value.projectionHashes)
        if (value.version !== this.get('_app.version')) {
          this.emit('version', value.version)
        }
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

  async del (path) {
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

  async send (message) {
    debug('send', message, this.online)
    if (!this.online || !message.id) return

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

  async syncDate () {
    let start = Date.now()
    let op = {
      id: this.id(),
      type: 'date'
    }
    let serverDate = await this.send(op)
    if (!serverDate) return
    // TODO: could it be better?
    let end = Date.now()
    let requestTime = end - start
    let serverNow = serverDate - (requestTime / 2)
    let dateDiff = this.dateDiff = serverNow - end
    this.set('_app.dateDiff', dateDiff)
  }

  date () {
    return Date.now() + this.dateDiff
  }

  id () {
    return uuid.v4()
  }

  close () {
    this.channel.emit('close')
  }

  destroy () {
    this.close()
  }

  getBundleJsonFromCacheOrDom () {
    if (this.bundleJson) return this.bundleJson
    let json = this.bundleJson = getBundleJsonFromDom()
    return json
  }

  getBundleJson () {
    if (!isServer) return this.getBundleJsonFromCacheOrDom()

    let bundle = {
      collections: this.collectionSet.bundle()
    }

    let json = JSON.stringify(bundle)
    json = json && json.replace(/<\//g, '<\\/')
    return json
  }

  unbundle () {
    if (this.bundle) return this.bundle
    let json = this.getBundleJsonFromCacheOrDom()
    let bundle = JSON.parse(json)
    this.bundle = bundle
    return bundle
  }

  unbundleLocalData () {
    let bundle = this.unbundle()
    let collections = bundle.collections || {}

    let local = {
      collections: {
        _app: collections._app,
        _session: collections._session
      }
    }
    this.collectionSet.unbundle(local.collections)
  }

  unbundleData () {
    let bundle = this.unbundle()
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

    let collectionNames = []

    for (let collectionName in this.options.collections) {
      if (this.options.collections[collectionName].client) {
        collectionNames.push(collectionName)
      }
    }

    this.set('_app.version', options.version)
    this.set('_app.newProjectionHashes', this.projectionHashes)
    this.set('_app.clientStorage', options.clientStorage)
    this.set('_app.collectionNames', collectionNames)
  }
}

export default Model
