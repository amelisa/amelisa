import { EventEmitter } from 'events'

let defaultGetOptions = {
  map: false
}

class Query extends EventEmitter {
  constructor (collectionName, expression) {
    super()
    this.collectionName = collectionName
    this.data = []
  }

  get (options) {
    if (!this.isDocs) return this.data

    options = Object.assign({}, defaultGetOptions, options)

    if (options.map) {
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
