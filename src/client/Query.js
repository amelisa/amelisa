import { EventEmitter } from 'events'
import MongoQueries from '../mongo/MongoQueries'

class Query extends EventEmitter {
  constructor (collectionName, expression) {
    super()
    if (!expression) expression = MongoQueries.allSelector
    this.collectionName = collectionName
    this.expression = expression
    this.data = []
    this.isDocs = this.isDocsQuery(expression)
    this.isServerOnly = this.isServerOnlyQuery(expression)
  }

  get (options) {
    if (!this.isDocs) return this.data

    if (options && options.map) {
      let map = {}
      for (let docId of this.data) {
        map[docId] = this.collection.get(docId)
      }

      return map
    }

    return this.data
      .map((docId) => this.collection.get(docId))
      // FIXME: we need this to avoid race condition with del
      .filter((docData) => docData)
  }

  isDocsQuery (expression) {
    return MongoQueries.prototype.isDocsQuery(expression)
  }

  isServerOnlyQuery (expression) {
    return MongoQueries.prototype.isServerOnlyQuery(expression)
  }

  getQueryResultFromArray (docs, expression) {
    return MongoQueries.prototype.getQueryResultFromArray(docs, expression)
  }
}

export default Query
