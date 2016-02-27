let debug = require('debug')('RemoteDoc')
import MutableDoc from './MutableDoc'
import { arrayRemove } from '../util'

class RemoteDoc extends MutableDoc {
  constructor (docId, ops, collection, model, serverVersion) {
    super(docId, ops, collection, model)
    this.serverVersion = serverVersion
    this.subscribed = 0
  }

  refresh () {
    this.refreshState()
    this.emit('change')
  }

  fetch () {
    return this.model.sendOp({
      type: 'fetch',
      collectionName: this.collection.name,
      docId: this.docId
    })
  }

  subscribe () {
    this.subscribed++
    if (this.subscribed !== 1) return Promise.resolve()

    return this.model.sendOp({
      type: 'sub',
      collectionName: this.collection.name,
      docId: this.docId,
      version: this.version()
    })
  }

  unsubscribe () {
    this.subscribed--
    if (this.subscribed !== 0) return Promise.resolve()

    return this.model.sendOp({
      type: 'unsub',
      collectionName: this.collection.name,
      docId: this.docId
    })
  }

  onFetched (serverVersion, ops) {
    debug('fetched', serverVersion)
    this.serverVersion = serverVersion
    this.applyOps(ops)
    this.emit('change')
    this.save()

    let opsToSend = this.getOpsToSend(serverVersion)
    for (let op of opsToSend) {
      this.model.send(op)
    }
  }

  onSubscribed (serverVersion, ops) {
    debug('subscribed', serverVersion)
    this.serverVersion = serverVersion
    this.applyOps(ops)
    this.emit('change')
    this.save()

    let opsToSend = this.getOpsToSend(serverVersion)
    for (let op of opsToSend) {
      this.model.send(op)
    }
  }

  onOp (op) {
    debug('onOp', op)
    super.onOp(op)
    return this.model.send(op)
  }

  receiveOp (op) {
    debug('receiveOp', op.type)
    let shouldEmit = this.shouldEmit(op)
    this.applyOp(op)
    if (shouldEmit) this.emit('change')
    this.collection.emit('change', op)
    this.save()
  }

  rejectOp (opId) {
    let op = this.ops.find((op) => op.id === opId)
    debug('rejectOp', opId, op, this.ops.length, this.get())
    if (op) {
      arrayRemove(this.ops, op)
      this.refreshState()
      this.emit('change')
      this.collection.emit('change', op)
      this.save()
    }
  }

  sendAllOps () {
    for (let op of this.ops) {
      this.model.send(op)
    }
  }

  getSyncData () {
    let data = {
      ops: this.getOpsToSend(this.serverVersion),
      version: this.version()
    }

    return data
  }
}

export default RemoteDoc
