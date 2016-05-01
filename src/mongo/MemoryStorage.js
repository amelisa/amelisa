import MongoQueries from './MongoQueries'

class MemoryStorage extends MongoQueries {
  constructor () {
    super()
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
    if (!collection[docId]) return

    return this.normalizeIdInDoc({...collection[docId]})
  }

  async getDocsByQuery (collectionName, expression) {
    let collection = this.getOrCreateCollection(collectionName)

    let allDocs = []
    for (let docId in collection) {
      allDocs.push({...collection[docId]})
    }

    let docs = this.getQueryResultFromArray(allDocs, expression)
    if (this.isDocsQuery(expression)) docs = docs.map(this.normalizeIdInDoc)
    return docs
  }

  async saveOp (op) {}

  async saveDoc (collectionName, docId, state, prevVersion, version, ops) {
    let doc = {
      _id: docId,
      _v: version,
      _ops: ops
    }

    for (let key in state) {
      doc[key] = state[key]
    }

    let collection = this.getOrCreateCollection(collectionName)
    collection[docId] = doc
  }

  getDbQueries () {
    return new MongoQueries()
  }
}

export default MemoryStorage
