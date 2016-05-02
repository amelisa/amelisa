import MongoQueries from './MongoQueries'

class MemoryStorage extends MongoQueries {
  constructor () {
    super()
    this.clear()
  }

  async init () {}

  async clear () {
    this.data = {}
    this.opsData = {}
  }

  getOrCreateCollection (collectionName) {
    let collection = this.data[collectionName]
    if (!collection) {
      collection = this.data[collectionName] = {}
    }

    return collection
  }

  getOrCreateOpsCollection (collectionName) {
    let collection = this.opsData[collectionName]
    if (!collection) {
      collection = this.opsData[collectionName] = {}
    }

    return collection
  }

  async getDocById (collectionName, docId) {
    let collection = this.getOrCreateCollection(collectionName)
    if (!collection[docId]) return

    return this.demongolizeDoc({...collection[docId]})
  }

  async getDocsByQuery (collectionName, expression) {
    let collection = this.getOrCreateCollection(collectionName)

    let allDocs = []
    for (let docId in collection) {
      allDocs.push({...collection[docId]})
    }

    let docs = this.getQueryResultFromArray(allDocs, expression)
    if (this.isDocsQuery(expression)) docs = docs.map(this.demongolizeDoc)
    return docs
  }

  async saveOp (op) {
    let { id, collectionName } = op
    let collection = this.getOrCreateOpsCollection(collectionName)
    collection[id] = op
  }

  async getOpsByQuery (collectionName) {
    let collection = this.getOrCreateOpsCollection(collectionName)

    let allOps = []
    for (let docId in collection) {
      allOps.push({...collection[docId]})
    }

    return allOps
  }

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
    let prevDoc = collection[docId]

    if (prevVersion && (!prevDoc || prevDoc._v !== prevVersion)) {
      throw new Error('stale data')
    }

    collection[docId] = doc
  }

  getDbQueries () {
    return new MongoQueries()
  }
}

export default MemoryStorage
