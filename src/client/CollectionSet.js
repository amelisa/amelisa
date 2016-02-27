import LocalCollection from './LocalCollection'
import RemoteCollection from './RemoteCollection'
import { isLocalCollection } from '../util'

class CollectionSet {
  constructor (model, data = {}) {
    this.model = model
    this.data = data
  }

  get (collectionName, docId, field) {
    if (!collectionName) {
      let state = {}
      for (let collectionName in this.data) {
        state[collectionName] = this.data[collectionName].get()
      }
      return state
    }

    let collection = this.data[collectionName]
    if (collection) return collection.get(docId, field)
  }

  getCollection (collectionName) {
    let collection = this.data[collectionName]

    return collection
  }

  getOrCreateCollection (collectionName) {
    let collection = this.data[collectionName]

    if (!collection) {
      if (isLocalCollection(collectionName)) {
        collection = new LocalCollection(collectionName, undefined, this.model)
      } else {
        collection = new RemoteCollection(collectionName, undefined, this.model)
      }
      this.data[collectionName] = collection
    }

    return collection
  }

  getDoc (collectionName, docId) {
    let collection = this.getCollection(collectionName)
    if (collection) {
      return collection.getDoc(docId)
    }
  }

  getOrCreateDoc (collectionName, docId) {
    let doc = this.getDoc(collectionName, docId)
    if (!doc) {
      let collection = this.getOrCreateCollection(collectionName)
      doc = collection.attach(docId, [])
    }
    return doc
  }

  clearCollection (collectionName) {
    delete this.data[collectionName]
  }

  async fillLocalCollectionsFromClientStorage () {
    if (!this.model.storage) return

    let collectionNames = await this.model.storage.getCollectionNames()
    for (let collectionName of collectionNames) {
      if (!isLocalCollection(collectionName)) continue
      let collection = this.getOrCreateCollection(collectionName)
      await collection.fillFromClientStorage()
    }
  }

  async fillFromClientStorage () {
    if (!this.model.storage) return

    let collectionNames = await this.model.storage.getCollectionNames()
    for (let collectionName of collectionNames) {
      let collection = this.getOrCreateCollection(collectionName)
      await collection.fillFromClientStorage()
    }
  }

  rejectOp (collectionName, docId, opId) {
    let doc = this.getOrCreateDoc(collectionName, docId)
    doc.rejectOp(opId)
  }

  getSyncData () {
    let data = {}

    for (let collectionName in this.data) {
      if (isLocalCollection(collectionName)) continue
      let collection = this.data[collectionName]
      data[collectionName] = collection.getSyncData()
    }

    return data
  }

  bundle () {
    let data = {}

    for (let collectionName in this.data) {
      let collection = this.data[collectionName]
      data[collectionName] = collection.bundle()
    }

    return data
  }

  unbundle (data) {
    for (let collectionName in data) {
      let collection = this.getOrCreateCollection(collectionName)
      let collectionBundle = data[collectionName]
      collection.unbundle(collectionBundle)
    }
  }
}

export default CollectionSet
