let debug = require('debug')('MutableDoc')
import Doc from './Doc'

class MutableDoc extends Doc {
  constructor (docId, ops, collection, model) {
    super(docId, ops)
    this.collection = collection
    this.model = model
  }

  async set (field, value) {
    let op = this.model.createOp({
      type: 'set',
      collectionName: this.collection.name,
      docId: this.docId,
      field,
      value
    })

    return this.onOp(op)
  }

  async del (field) {
    let op = this.model.createOp({
      type: 'del',
      collectionName: this.collection.name,
      docId: this.docId
    })

    if (field) op.field = field

    return this.onOp(op)
  }

  refresh () {
    this.refreshState()
    this.emit('change')
  }

  async onOp (op) {
    debug('onOp', op)
    this.applyOp(op)
    this.emit('change')
    this.collection.emit('change', op)
    return this.save()
  }

  async save () {
    if (!this.model.storage || !this.ops.length) return
    debug('save', this.state, this.ops)
    return this.model.storage
      .saveDoc(this.collection.name, this.docId, this.ops, this.serverVersion)
      .catch((err) => {
        console.error('MutableDoc.save', this.collection.name, err)
      })
  }
}

export default MutableDoc
