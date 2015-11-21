// let debug = require('debug')('LocalDoc')
import MutableDoc from './MutableDoc'

class LocalDoc extends MutableDoc {
  constructor (docId, ops, collection, model, storage) {
    super(docId, ops, collection, model, storage)
  }

  subscribe () {
    return Promise.resolve()
  }

  unsubscribe () {
    return Promise.resolve()
  }

  onOp (op) {
    super.onOp(op)
    return Promise.resolve()
  }
}

export default LocalDoc
