// let debug = require('debug')('LocalQuery')
import ClientQuery from './ClientQuery'

class LocalQuery extends ClientQuery {
  constructor (collectionName, expression, model, collection, querySet) {
    super(collectionName, expression, model, collection, querySet)
    this.local = true
    this.refresh()
  }

  get () {
    if (!this.isDocs) return this.data

    return this.data.map((docId) => this.collection.get(docId))
  }

  refresh (op) {
    super.refresh(op)

    // TODO: emit only if there were changes
    this.emit('change')
  }

  subscribe () {
    return Promise.resolve()
  }

  unsubscribe () {
    return Promise.resolve()
  }
}

export default LocalQuery
