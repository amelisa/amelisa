let debug = require('debug')('MutableDoc')
import Doc from './Doc'

class MutableDoc extends Doc {
  constructor (docId, ops, collection, model, storage) {
    super(docId, ops)
    this.collection = collection
    this.model = model
    this.storage = storage
  }

  set (field, value) {
    let op = this.model.createOp({
      type: 'set',
      collectionName: this.collection.name,
      docId: this.docId,
      field: field,
      value: value
    })

    return this.onOp(op)
  }

  del (field) {
    let op = this.model.createOp({
      type: 'del',
      collectionName: this.collection.name,
      docId: this.docId,
      field: field
    })

    return this.onOp(op)
  }

  refresh () {
    this.refreshState()
    this.emit('change')
  }

  onOp (op) {
    debug('onOp', op)
    this.applyOp(op)
    this.save()
    this.emit('change')
    this.collection.emit('change', op)
    return Promise.resolve()
  }

  save () {
    if (!this.storage || !this.ops.length) return
    debug('save', this.state, this.ops)
    return this.storage
      .saveDoc(this.collection.name, this.docId, this.state, this.serverVersion, this.version(), this.ops)
      .catch((err) => {
        console.error('MutableDoc.save', err)
      })
  }
}

export default MutableDoc
