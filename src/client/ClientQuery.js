import Query from './Query'
import RemoteDoc from './RemoteDoc'
import { fastEqual } from '../util'

class ClientQuery extends Query {
  constructor (collectionName, expression, model, collection, querySet) {
    super(collectionName, expression)

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
    let docs = this.collection.getDocs()
    let data = this.model.dbQueries.getQueryResultFromArray(docs, this.expression)
    if (this.isDocs) data = data.map((docData) => docData.id)

    this.setData(data)
  }

  setData (data) {
    let prev = this.data
    this.data = data

    if (this.dataHasChanged(prev, data)) {
      this.emit('change')
    }
  }

  onCollectionChange = (op) => {
    if (!this.fetching) this.refresh(op)
  };

  dataHasChanged (prev, data) {
    if (typeof prev !== typeof data) return true

    if (this.isDocs) {
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
