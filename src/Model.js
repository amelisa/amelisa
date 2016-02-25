let debug = require('debug')('Model')
import uuid from 'uuid'
import { EventEmitter } from 'events'
import CollectionSet from './CollectionSet'
import ClientQuerySet from './ClientQuerySet'
import Subscription from './Subscription'
import { clone, isLocalCollection, isServer, parseArguments, parsePath } from './util'

class Model extends EventEmitter {
  constructor (channel, source, options = {}) {
    super()
    this.channel = channel
    this.online = false
    this.source = source
    this.options = options
    this.collectionSet = new CollectionSet(this)
    this.querySet = new ClientQuerySet(this)
    this.callbacks = {}
    this.dateDiff = 0

    channel.on('message', (message) => {
      debug('message', message)
      this.onMessage(message)
    })

    channel.on('open', () => {
      debug('open')
      this.setOnline()
    })

    channel.on('close', () => {
      debug('close')
      this.setOffline()
    })

    channel.on('error', (err) => {
      console.error('Connection error', err)
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

  setOnline () {
    this.online = true

    // TODO: do not sync when server
    this.syncDate()

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

  onMessage (message) {
    let { type, id, collectionName, docId, expression, value, version, ids, diffs, docs, error } = message
    let doc
    let query
    let collection
    let callbacks
    if (type === 'ackdate' || type === 'ack') {
      callbacks = this.callbacks[id]
      if (callbacks) delete this.callbacks[id]
    }

    debug('onMessage', this.source, type, id, collectionName, docId, expression, !!callbacks, value, diffs, docs)

    switch (type) {
      case 'ackdate':
        if (callbacks && !error) {
          for (let callback of callbacks) {
            callback(null, value)
          }
        }
        break

      case 'ack':
        if (error) this.collectionSet.rejectOp(collectionName, docId, id)

        if (callbacks) {
          for (let callback of callbacks) {
            if (error) {
              callback(new Error(error))
            } else {
              callback(null, value)
            }
          }
        }
        break

      case 'sub':
        doc = this.collectionSet.getDoc(collectionName, docId)
        if (doc) {
          doc.onSubscribed(version)
        }
        break

      case 'q':
        query = this.querySet.getOrCreateQuery(collectionName, expression)
        if (query.isDocs) {
          query.onSnapshotDocs(ids, docs, version)
        } else {
          query.onSnapshotNotDocs(value, version)
        }
        break

      case 'qdiff':
        query = this.querySet.getOrCreateQuery(collectionName, expression)
        query.onDiff(diffs, docs, version)
        break

      case 'sync':
        this
          .onProjections(value.projectionHashes)
          .then(() => {
            if (value.version !== this.get('_app.version')) {
              this.emit('version', value.version)
            }
          })
          .catch((error) => {
            console.error(error)
          })
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
  }

  get () {
    let [collectionName, docId, field] = parseArguments(arguments)
    return this.collectionSet.get(collectionName, docId, field)
  }

  add (collectionName, docData) {
    if (!collectionName) return console.error('Model.add collectionName is required')
    if (typeof collectionName !== 'string') return console.error('Model.add collectionName should be a string')
    if (!docData) return console.error('Model.add docData is required')
    if (typeof docData !== 'object') return console.error('Model.add docData should be an object')

    docData = clone(docData)
    let docId = docData._id
    if (!docId) docId = this.id()
    else delete docData._id

    let collection = this.collectionSet.getOrCreateCollection(collectionName)
    return collection.add(docId, docData)
  }

  set (path, value) {
    let [collectionName, docId, field] = parsePath(path)

    if (!collectionName) return console.error('Model.set collectionName is required')
    if (typeof collectionName !== 'string') return console.error('Model.set collectionName should be a string')
    if (!docId) return console.error('Model.set docId is required')
    if (typeof docId !== 'string') return console.error('Model.set docId should be a string')
    if (field && typeof field !== 'string') return console.error('Model.set field should be a string')

    let doc = this.collectionSet.getOrCreateDoc(collectionName, docId)

    return doc.set(field, value)
  }

  del (path) {
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

  onProjections (newProjectionHashes) {
    let prevProjectionHashes = this.get('_app.projectionHashes')

    let collectionNames = this.getCollectionNamesToClear(prevProjectionHashes, newProjectionHashes)

    if (!this.storage) return Promise.resolve()
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

  send (message) {
    debug('send', message, this.online)
    if (!this.online) return Promise.resolve()

    return new Promise((resolve, reject) => {
      let callback = (err) => {
        if (err) return reject(err)

        resolve()
      }
      let callbacks = this.callbacks[message.id]
      if (!callbacks) callbacks = this.callbacks[message.id] = []
      callbacks.push(callback)

      this.channel.send(message)
    })
  }

  createOp (opData) {
    let op = {
      id: this.id(),
      source: this.source,
      date: this.date()
    }

    for (let key in opData) {
      if (opData[key] !== undefined) op[key] = opData[key]
    }

    return op
  }

  sendOp (opData) {
    // debug('sendOp', opData)
    let op = this.createOp(opData)

    return this.send(op)
  }

  syncDate () {
    let start = Date.now()
    this.sendOp({type: 'date'}, (err, serverDate) => {
      if (err) return console.error('syncDate error:', err)
      // TODO: could it be better?
      let end = Date.now()
      let requestTime = end - start
      let serverNow = serverDate - (requestTime / 2)
      let diff = serverNow - end
      // debug('syncDate', requestTime, diff)
      // TODO: save diff in localStorage
      this.dateDiff = diff
    })
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

  getBundleJsonFromDom () {
    if (this.json) return this.json
    let dataScript = document.getElementById('bundle')
    if (!dataScript) return '{}'

    let json = dataScript.innerHTML
    this.json = json
    return json
  }

  getBundleJson () {
    if (!isServer) return this.getBundleJsonFromDom()

    let bundle = {
      collections: this.collectionSet.bundle()
    }

    let json = JSON.stringify(bundle)
    json = json && json.replace(/<\//g, '<\\/')
    return json
  }

  unbundle () {
    if (this.bundle) return this.bundle
    let json = this.getBundleJsonFromDom()
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
    this.set('_app.newProjectionHashes', options.projectionHashes)
    this.set('_app.clientStorage', options.clientStorage)
    this.set('_app.collectionNames', collectionNames)

    return Promise.resolve()
  }
}

export default Model
