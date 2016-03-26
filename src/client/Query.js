import { EventEmitter } from 'events'

class Query extends EventEmitter {
  constructor (collectionName, expression) {
    super()
    this.collectionName = collectionName
    this.data = []
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
}

export default Query
