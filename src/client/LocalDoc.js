import MutableDoc from './MutableDoc'

class LocalDoc extends MutableDoc {
  constructor (docId, ops, collection, model) {
    super(docId, ops, collection, model)
  }
}

export default LocalDoc
