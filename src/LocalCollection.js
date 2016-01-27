// let debug = require('debug')('LocalCollection')
import Collection from './Collection'
import LocalDoc from './LocalDoc'

class LocalCollection extends Collection {
  constructor (name, data, model) {
    super(name, data, model)
    this.local = true
  }

  add (docId, docData) {
    super.add(docId, docData)
    return Promise.resolve()
  }

  attach (docId, ops) {
    let doc = new LocalDoc(docId, ops, this, this.model)

    this.data[docId] = doc
    return doc
  }
}

export default LocalCollection
