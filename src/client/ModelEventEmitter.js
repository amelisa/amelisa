import { EventEmitter } from 'events'

const mutateEvents = {
  change: true
}

class ModelEventEmitter extends EventEmitter {
  constructor () {
    super()

    this.collections = {}

    // Set max listeners to unlimited
    this.setMaxListeners(0)
  }

  addListener (...args) {
    this.on.apply(this, args)
  }

  on (type, pattern, cb) {
    if (!mutateEvents[type]) {
      return super.on.apply(this, arguments)
    }

    let [ collectionName, docId, ...parts ] = pattern.split('.')
    let field = parts.join('.')

    if (!collectionName) return

    let collection = this.collections[collectionName]
    if (!collection) collection = this.collections[collectionName] = {}

    if (!docId) {
      let listeners = collection.listeners
      if (!listeners) listeners = collection.listeners = []
      listeners.push({
        type,
        cb
      })
      return
    }

    let doc = collection[docId]
    if (!doc) doc = collection[docId] = {}

    if (!field) {
      let listeners = doc.listeners
      if (!listeners) listeners = doc.listeners = []
      listeners.push({
        type,
        cb
      })
      return
    }

    let property = doc[field]
    if (!property) property = doc[field] = {}

    let listeners = property.listeners
    if (!listeners) listeners = property.listeners = []
    listeners.push({
      type,
      cb
    })
  }

  emit (type, pattern, ...params) {
    if (!mutateEvents[type]) {
      return super.emit.apply(this, arguments)
    }

    let [ collectionName, docId, ...parts ] = pattern.split('.')
    let field = parts.join('.')

    if (!collectionName) return

    let collection = this.collections[collectionName]
    if (!collection) return

    if (!docId) {
      for (let docId in collection) {
        let doc = collection[docId]
        for (let field in doc) {
          let property = doc[field]
          for (let listener of property.listeners) {
            listener.cb.apply(this, params)
          }
        }
      }
    }

    let doc = collection[docId]
    if (!doc) return

    if (!field) {
      for (let field in doc) {
        let property = doc[field]
        for (let listener of property.listeners) {
          listener.cb.apply(this, params)
        }
      }
    }

    let property = doc[field]
    if (!property) return

    for (let listener of property.listeners) {
      listener.cb.apply(this, params)
    }
  }
}

export default ModelEventEmitter
