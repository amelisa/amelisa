// let debug = require('debug')('LocalQuery')
import ClientQuery from './ClientQuery'

class LocalQuery extends ClientQuery {
  constructor (collectionName, expression, model, collection, querySet) {
    super(collectionName, expression, model, collection, querySet)
    this.local = true
  }

  refresh (op) {
    let prevData = this.data
    super.refresh(op)

    if (this.dataHasChanged(prevData, this.data)) {
      this.emit('change')
    }
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
}

export default LocalQuery
