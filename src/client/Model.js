let debug = require('debug')('Model')
import invariant from 'invariant'
import uuid from 'uuid'
import { EventEmitter } from 'events'
import CollectionSet from './CollectionSet'
import ClientQuerySet from './ClientQuerySet'
import Subscription from './Subscription'
import { deepClone, isLocalCollection, isServer, parseArguments, parsePath } from '../util'

const defaultOptions = {
  clientSaveDebounceTimeout: 1000
}

class Model extends EventEmitter {
  constructor (channel, source, options = {}, projectionHashes = {}) {
    super()
    this.channel = channel
    this.initing = false
    this.inited = false
    this.ready = false
    this.online = false
    this.source = source
    this.options = Object.assign({}, defaultOptions, options)
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

      case 'ops':
        doc = this.collectionSet.getDoc(collectionName, docId)
        if (doc) {
          doc.receiveOps(ops, message.opsType, message.index, message.howMany)
        }
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
    invariant(collectionName && typeof collectionName === 'string', 'Model.add collectionName is required and should be a string')
    invariant(docData && typeof docData === 'object', 'Model.add docData is required and should be an object')

    docData = deepClone(docData)
    let docId = docData._id
    if (!docId) docId = this.id()
    else delete docData._id

    let collection = this.collectionSet.getOrCreateCollection(collectionName)
    return collection.add(docId, docData)
  }

  async set (path, value) {
    let [collectionName, docId, field] = parsePath(path)

    invariant(collectionName && typeof collectionName === 'string', 'Model.set collectionName is required and should be a string')
    invariant(docId && typeof docId === 'string', 'Model.set docId is required and should be a string')
    invariant(!field || typeof field === 'string', 'Model.set field should be a string')

    let doc = this.collectionSet.getOrCreateDoc(collectionName, docId)

    return doc.set(field, value)
  }

  async del (...path) {
    let [collectionName, docId, field] = parsePath(path)

    invariant(collectionName && typeof collectionName === 'string', 'Model.del collectionName is required and should be a string')
    invariant(docId && typeof docId === 'string', 'Model.del docId is required and should be a string')
    invariant(!field || typeof field === 'string', 'Model.del field should be a string')

    let doc = this.collectionSet.getOrCreateDoc(collectionName, docId)

    return doc.del(field)
  }

  async push (path, value) {
    let [collectionName, docId, field] = parsePath(path)

    invariant(collectionName && typeof collectionName === 'string', 'Model.push collectionName is required and should be a string')
    invariant(docId && typeof docId === 'string', 'Model.push docId is required and should be a string')
    invariant(!field || typeof field === 'string', 'Model.push field should be a string')

    let doc = this.collectionSet.getOrCreateDoc(collectionName, docId)

    return doc.push(field, value)
  }

  async unshift (path, value) {
    let [collectionName, docId, field] = parsePath(path)

    invariant(collectionName && typeof collectionName === 'string', 'Model.unshift collectionName is required and should be a string')
    invariant(docId && typeof docId === 'string', 'Model.unshift docId is required and should be a string')
    invariant(!field || typeof field === 'string', 'Model.unshift field should be a string')

    let doc = this.collectionSet.getOrCreateDoc(collectionName, docId)

    return doc.unshift(field, value)
  }

  async pop (path) {
    let [collectionName, docId, field] = parsePath(path)

    invariant(collectionName && typeof collectionName === 'string', 'Model.pop collectionName is required and should be a string')
    invariant(docId && typeof docId === 'string', 'Model.pop docId is required and should be a string')
    invariant(!field || typeof field === 'string', 'Model.pop field should be a string')

    let doc = this.collectionSet.getOrCreateDoc(collectionName, docId)

    return doc.pop(field)
  }

  async shift (path) {
    let [collectionName, docId, field] = parsePath(path)

    invariant(collectionName && typeof collectionName === 'string', 'Model.shift collectionName is required and should be a string')
    invariant(docId && typeof docId === 'string', 'Model.shift docId is required and should be a string')
    invariant(!field || typeof field === 'string', 'Model.shift field should be a string')

    let doc = this.collectionSet.getOrCreateDoc(collectionName, docId)

    return doc.shift(field)
  }

  async insert (path, index, values) {
    let [collectionName, docId, field] = parsePath(path)

    invariant(collectionName && typeof collectionName === 'string', 'Model.insert collectionName is required and should be a string')
    invariant(docId && typeof docId === 'string', 'Model.insert docId is required and should be a string')
    invariant(!field || typeof field === 'string', 'Model.insert field should be a string')
    invariant(typeof index === 'number', 'Model.insert index should be a number')

    let doc = this.collectionSet.getOrCreateDoc(collectionName, docId)

    return doc.insert(field, index, values)
  }

  async remove (path, index, howMany) {
    let [collectionName, docId, field] = parsePath(path)

    invariant(collectionName && typeof collectionName === 'string', 'Model.remove collectionName is required and should be a string')
    invariant(docId && typeof docId === 'string', 'Model.remove docId is required and should be a string')
    invariant(!field || typeof field === 'string', 'Model.remove field should be a string')
    invariant(typeof index === 'number', 'Model.remove index should be a number')
    invariant(typeof howMany === 'number', 'Model.remove howMany should be a number')

    let doc = this.collectionSet.getOrCreateDoc(collectionName, docId)

    return doc.remove(field, index, howMany)
  }

  async move (path, from, to, howMany) {
    let [collectionName, docId, field] = parsePath(path)

    invariant(collectionName && typeof collectionName === 'string', 'Model.move collectionName is required and should be a string')
    invariant(docId && typeof docId === 'string', 'Model.move docId is required and should be a string')
    invariant(!field || typeof field === 'string', 'Model.move field should be a string')
    invariant(typeof from === 'number', 'Model.move from should be a number')
    invariant(typeof to === 'number', 'Model.move to should be a number')
    invariant(!howMany || typeof howMany === 'number', 'Model.move howMany should be a number')

    let doc = this.collectionSet.getOrCreateDoc(collectionName, docId)

    return doc.move(field, from, to, howMany)
  }

  async invert (path) {
    let [collectionName, docId, field] = parsePath(path)

    invariant(collectionName && typeof collectionName === 'string', 'Model.invert collectionName is required and should be a string')
    invariant(docId && typeof docId === 'string', 'Model.invert docId is required and should be a string')
    invariant(!field || typeof field === 'string', 'Model.invert field should be a string')

    let doc = this.collectionSet.getOrCreateDoc(collectionName, docId)

    return doc.invert(field)
  }

  async increment (path, value) {
    let [collectionName, docId, field] = parsePath(path)

    invariant(collectionName && typeof collectionName === 'string', 'Model.increment collectionName is required and should be a string')
    invariant(docId && typeof docId === 'string', 'Model.increment docId is required and should be a string')
    invariant(!field || typeof field === 'string', 'Model.increment field should be a string')
    invariant(value === undefined || typeof value === 'number', 'Model.increment value should be a number')

    let doc = this.collectionSet.getOrCreateDoc(collectionName, docId)

    return doc.increment(field, value)
  }

  async stringInsert (path, index, value) {
    let [collectionName, docId, field] = parsePath(path)

    invariant(collectionName && typeof collectionName === 'string', 'Model.stringInsert collectionName is required and should be a string')
    invariant(docId && typeof docId === 'string', 'Model.stringInsert docId is required and should be a string')
    invariant(!field || typeof field === 'string', 'Model.stringInsert field should be a string')
    invariant(typeof index === 'number', 'Model.stringInsert index should be a number')
    invariant(typeof value === 'string', 'Model.stringInsert value should be a string')

    let doc = this.collectionSet.getOrCreateDoc(collectionName, docId)

    return doc.stringInsert(field, index, value)
  }

  async stringRemove (path, index, howMany) {
    let [collectionName, docId, field] = parsePath(path)

    invariant(collectionName && typeof collectionName === 'string', 'Model.stringRemove collectionName is required and should be a string')
    invariant(docId && typeof docId === 'string', 'Model.stringRemove docId is required and should be a string')
    invariant(!field || typeof field === 'string', 'Model.stringRemove field should be a string')
    invariant(typeof index === 'number', 'Model.stringRemove index should be a number')
    invariant(typeof howMany === 'number', 'Model.stringRemove howMany should be a number')

    let doc = this.collectionSet.getOrCreateDoc(collectionName, docId)

    return doc.stringRemove(field, index, howMany)
  }

  async stringDiff (path, value) {
    let [collectionName, docId, field] = parsePath(path)

    invariant(collectionName && typeof collectionName === 'string', 'Model.stringDiff collectionName is required and should be a string')
    invariant(docId && typeof docId === 'string', 'Model.stringDiff docId is required and should be a string')
    invariant(!field || typeof field === 'string', 'Model.stringDiff field should be a string')
    invariant(typeof value === 'string', 'Model.stringDiff value should be a string')

    let doc = this.collectionSet.getOrCreateDoc(collectionName, docId)

    return doc.stringDiff(field, value)
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
