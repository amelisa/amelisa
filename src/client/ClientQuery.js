import Query from './Query'
import RemoteDoc from './RemoteDoc'
import { dbFields, fastEqual } from '../util'

class ClientQuery extends Query {
  constructor (collectionName, expression, model, collection, querySet) {
    super(collectionName, expression)

    if (!expression) expression = this.model.dbQueries.getAllSelector()
    this.expression = expression
    this.model = model
    this.collection = collection
    this.querySet = querySet
    this.isDocs = this.model.dbQueries.isDocsQuery(expression)

    this.refresh()
  }

  async fetch () {
    this.refresh()
  }

  async subscribe () {
    this.refresh()
    this.collection.on('change', this.onCollectionChange)
  }

  async unsubscribe () {
    this.collection.removeListener('change', this.onCollectionChange)
  }

  async fetchAndGet () {
    await this.fetch()

    return this.get()
  }

  getStateFromDocData (doc) {
    let state = {}
    for (let field in doc) {
      if (!dbFields[field]) state[field] = doc[field]
    }
    return state
  }

  getStatesFromDocs (docs) {
    if (!this.isDocs) return docs
    return docs.map((doc) => this.getStateFromDocData(doc))
  }

  attachDocsToCollection (docs) {
    for (let docId in docs) {
      let ops = docs[docId]
      let serverVersion = RemoteDoc.prototype.getVersionFromOps(ops)
      let doc = this.collection.getDoc(docId)
      if (doc) {
        doc.applyOps(ops)
        doc.distillOps()
        doc.serverVersion = serverVersion
      } else {
        doc = this.collection.attach(docId, ops, serverVersion)
      }
      doc.save()
    }
  }

  refresh () {
    let prevData = this.data

    let docs = this.collection.getDocs()
    let docDatas = this.model.dbQueries.getQueryResultFromArray(docs, this.expression)
    if (this.isDocs) {
      this.data = docDatas.map((docData) => docData._id)
    } else {
      this.data = docDatas
    }

    if (this.dataHasChanged(prevData, this.data)) {
      this.emit('change')
    }
  }

  onCollectionChange = (op) => {
    if (!this.subscribing) this.refresh(op)
  };

  dataHasChanged (prev, data) {
    if (typeof prev !== typeof data) return true

    if (this.model.dbQueries.isDocsQuery) {
      // there is no cheap way to compare all query docs, so for now
      // we always emit change
      return true
    } else {
      // count query
      if (typeof prev === 'number' && typeof data === 'number') {
        return prev !== data
      }
      // aggregation
      if (typeof prev === 'object' && typeof data === 'object') {
        // cheap keys comparison
        if (Object.keys(prev).length !== Object.keys(data).length) return true
      }
    }
    // expensive deep comparison
    return !fastEqual(prev, data)
  }
}

export default ClientQuery
