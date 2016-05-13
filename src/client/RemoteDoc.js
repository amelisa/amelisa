import MutableDoc from './MutableDoc'
import { arrayRemove } from '../util'

const defaultSubscribeOptions = {
  fetch: true
}

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

  async fetch () {
    if (this.fetching) return this.fetchingPromise
    this.fetching = true

    this.fetchingPromise = this.model.sendOp({
      type: 'fetch',
      collectionName: this.collection.name,
      docId: this.docId
    })
    return this.fetchingPromise
  }

  async subscribe (options) {
    options = {...defaultSubscribeOptions, ...options}
    this.subscribed++
    if (this.subscribed !== 1) return options.fetch ? this.fetchingPromise : undefined
    this.fetching = true

    this.fetchingPromise = this.sendSubscribeOp()
    return options.fetch ? this.fetchingPromise : undefined
  }

  async sendSubscribeOp () {
    return this.model.sendOp({
      type: 'sub',
      collectionName: this.collection.name,
      docId: this.docId,
      version: this.version()
    })
  }

  async unsubscribe () {
    this.subscribed--
    if (this.subscribed !== 0) return

    return this.model.sendOp({
      type: 'unsub',
      collectionName: this.collection.name,
      docId: this.docId
    })
  }

  onDataFromServer (serverVersion, ops) {
    this.serverVersion = serverVersion
    this.applyOps(ops)
    this.fetching = false
    this.emit('change')
    this.save()

    let opsToSend = this.getOpsToSend(serverVersion)
    for (let op of opsToSend) {
      this.model.send(op)
    }
  }

  async onOp (op) {
    super.onOp(op)
    await this.model.send(op)
    if (!this.model.online) return
    this.serverVersion = this.addOpToVersion(this.serverVersion, op)
  }

  receiveOp (newOp) {
    let existingOp = this.ops.find((op) => op.id === newOp.id)
    // TODO: debug repeating ops
    if (existingOp) return

    let { type, field, positionId } = newOp

    let index
    if (type === 'stringInsert' || type === 'stringRemove') {
      let string = this.getInternalAsStringType(field)
      index = string.getIndexByPositionId(positionId)
    }

    this.applyOp(newOp)
    this.serverVersion = this.addOpToVersion(this.serverVersion, newOp)

    if (type === 'stringInsert' || type === 'stringRemove') {
      if (index > -1) this.emit(type, field, index, 1)
    }

    this.emit('change')
    this.collection.emit('change', newOp)
    this.save()
  }

  receiveOps (ops, opsType, field, index, howMany) {
    if (!ops.length) return

    this.applyOps(ops, opsType)
    this.serverVersion = this.addOpsToVersion(this.serverVersion, ops)

    if (opsType === 'stringInsert' || opsType === 'stringRemove') {
      this.emit(opsType, field, index, howMany)
    }

    this.emit('change')
    for (let op of ops) {
      this.collection.emit('change', op)
    }
    this.save()
  }

  rejectOp (opId) {
    let op = this.ops.find((op) => op.id === opId)
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
