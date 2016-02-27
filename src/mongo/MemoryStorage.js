import MongoQueries from './MongoQueries'

class MemoryStorage extends MongoQueries {
  constructor (client = false) {
    super()
    this.client = client
    this.data = {}
  }

  async init () {}

  getOrCreateCollection (collectionName) {
    let collection = this.data[collectionName]
    if (!collection) {
      collection = this.data[collectionName] = {}
    }

    return collection
  }

  async clear () {
    this.data = {}
  }

  async getDocById (collectionName, docId) {
    let collection = this.getOrCreateCollection(collectionName)

    return collection[docId]
  }

  async getDocsByQuery (collectionName, expression) {
    let collection = this.getOrCreateCollection(collectionName)

    let allDocs = []
    for (let docId in collection) {
      allDocs.push(collection[docId])
    }

    let docs = this.getQueryResultFromArray(allDocs, expression)

    return docs
  }

  async saveDoc (collectionName, docId, state, prevVersion, version, ops) {
    let doc = {
      _id: docId,
      _v: version,
      _ops: ops
    }

    if (this.client) doc._sv = prevVersion

    for (let key in state) {
      doc[key] = state[key]
    }

    let collection = this.getOrCreateCollection(collectionName)
    collection[docId] = doc
  }
}

export default MemoryStorage
