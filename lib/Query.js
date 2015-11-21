import { EventEmitter } from 'events'
import MongoQueries from './MongoQueries'

class Query extends EventEmitter {
  constructor (collectionName, expression) {
    super()
    if (!expression) expression = MongoQueries.allSelector
    this.collectionName = collectionName
    this.expression = expression
    this.data = []
    this.isDocs = this.isDocsQuery(expression)
  }

  get () {
    return this.data
  }

  isDocsQuery (expression) {
    return MongoQueries.prototype.isDocsQuery(expression)
  }

  getQueryResultFromArray (docs, expression) {
    return MongoQueries.prototype.getQueryResultFromArray(docs, expression)
  }
}

export default Query
