// let debug = require('debug')('LocalDoc')
import MutableDoc from './MutableDoc'

class LocalDoc extends MutableDoc {
  constructor (docId, ops, collection, model) {
    super(docId, ops, collection, model)
  }

  async subscribe () {}

  async unsubscribe () {}

  async onOp (op) {
    return super.onOp(op)
  }
}

export default LocalDoc
