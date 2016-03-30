import Doc from '../client/Doc'
import Model from '../client/Model'
import { ArrayType, BooleanType, NumberType, StringType } from '../types'
import { arrayRemove } from '../util'

class ServerDoc extends Doc {
  constructor (collectionName, docId, ops, store, docSet) {
    super(docId, ops)
    this.collectionName = collectionName
    this.store = store
    this.docSet = docSet
    this.prevVersion = null
    this.loaded = false
    this.loading = false
    this.channels = []

    this.load()

    this.on('loaded', () => {
      this.broadcast()
    })

    // Set max listeners to unlimited
    this.setMaxListeners(0)
  }

  load () {
    if (this.loading) return
    this.loading = true

    this.store.storage
      .getDocById(this.collectionName, this.docId)
      .then((doc) => {
        if (doc) {
          this.applyOps(doc._ops)
          this.prevVersion = doc._v
        }

        this.loading = false
        this.loaded = true
        this.emit('loaded')
      })
      .catch((err) => {
        console.error('ServerDoc.load', err)
      })
  }

  onOpsOp (op, channel) {
    if (channel) channel._session.updateDocVersion(this.collectionName, this.docId, op.source, op.date)

    this.saveOp(op)
    this.applyOp(op)
  }

  onOp (op, channel) {
    if (channel) channel._session.updateDocVersion(this.collectionName, this.docId, op.source, op.date)

    this.saveOp(op)
    this.applyOp(op)
    this.broadcastOp(op, channel)
    this.save()
  }

  receiveOp (op) {
    this.applyOp(op)
    this.broadcastOp(op)
  }

  save () {
    if (!this.loaded) return
    if (this.ops.length === 0) return

    if (this.timeout) clearTimeout(this.timeout)
    this.timeout = setTimeout(() => this.saveToStorage(), this.store.options.saveDebounceTimeout)
  }

  saveToStorage () {
    let version = this.version()

    if (this.ops.length > this.store.options.cuttingOpsCount) {
      let date = Date.now() - this.store.options.cuttingTimeout
      let allOps = this.ops
      this.ops = allOps.filter((op) => op.date < date)
      this.refreshState()
      let cutOps = this.getCutOps(null, this.state)
      for (let cutOp of cutOps) {
        allOps.push(cutOp)
      }
      this.ops = allOps
      this.distillOps()
    }

    this.store.storage
      .saveDoc(this.collectionName, this.docId, this.getForSave(), this.prevVersion, version, this.ops)
      .then(() => {
        this.emit('saved')
        this.prevVersion = version
      })
      .catch((err) => {
        if (err.message === 'stale data') {
          this.once('loaded', this.save.bind(this))
          return this.load()
        } else {
          console.trace('ServerDoc.saveToStorage', err)
        }
      })
  }

  saveOp (op) {
    if (!this.store.options.saveOps) return
    if (!this.store.opsStorage.saveOp) return

    this.store.opsStorage
      .saveOp(op)
      .catch((err) => {
        console.trace('ServerDoc.saveOp', err)
      })
  }

  getCutOps (field, value) {
    let ops = []

    // TODO: use arraySet for array
    if (value instanceof ArrayType || value instanceof BooleanType || value instanceof NumberType) {
      let op = {
        id: Model.prototype.id(),
        source: this.store.options.source,
        date: Date.now(),
        type: 'set',
        collectionName: this.collectionName,
        docId: this.docId,
        value: this.get(field)
      }
      if (field) op.field = field
      ops.push(op)
    } else if (value instanceof StringType) {
      let op = {
        id: Model.prototype.id(),
        source: this.store.options.source,
        date: Date.now(),
        type: 'stringSet',
        collectionName: this.collectionName,
        docId: this.docId,
        value: value.getStringSetValue()
      }
      if (field) op.field = field
      ops.push(op)
    }

    if (value && typeof value === 'object') {
      for (let key in value) {
        let subField = field ? `${field}.${key}` : key
        ops = ops.concat(this.getCutOps(subField, value[key]))
      }
    }
    return ops
  }

  broadcast () {
    for (let channel of this.channels) {
      this.sendOpsToChannel(channel)
    }
  }

  broadcastOp (op, fromChannel) {
    for (let channel of this.channels) {
      channel._session.updateDocVersion(this.collectionName, this.docId, op.source, op.date)
      if (fromChannel && channel === fromChannel) continue
      this.sendOp(op, channel)
    }
  }

  sendOpsToChannel (channel, version) {
    if (!version) version = channel._session.getDocVersion(this.collectionName, this.docId)
    let opsToSend = this.getOpsToSend(version)

    for (let op of opsToSend) {
      this.sendOp(op, channel)
    }
  }

  fetch (channel, version, ackId) {
    let op = {
      type: 'fetch',
      collectionName: this.collectionName,
      docId: this.docId,
      version: this.version(),
      ops: this.getOpsToSend(version),
      ackId
    }
    this.sendOp(op, channel)

    this.maybeUnattach()
  }

  subscribeWithoutSending (channel, version) {
    channel._session.saveDocVersion(this.collectionName, this.docId, version)
    this.addChannel(channel)
  }

  subscribe (channel, version, ackId) {
    channel._session.saveDocVersion(this.collectionName, this.docId, version)
    this.addChannel(channel)

    let op = {
      type: 'sub',
      collectionName: this.collectionName,
      docId: this.docId,
      version: this.version(),
      ops: this.getOpsToSend(version),
      ackId
    }
    this.sendOp(op, channel)
  }

  unsubscribe (channel) {
    arrayRemove(this.channels, channel)

    this.maybeUnattach()
  }

  maybeUnattach () {
    setTimeout(() => {
      if (this.channels.length === 0) {
        this.destroy()
      }
    }, this.store.options.unattachTimeout)
  }

  destroy () {
    this.docSet.unattach(this.collectionName, this.docId)
  }

  sync (channel, version, resubscribe) {
    if (resubscribe) {
      channel._session.saveDocVersion(this.collectionName, this.docId, version)
      this.addChannel(channel)
    }
    this.sendOpsToChannel(channel)

    let op = {
      type: 'sync',
      collectionName: this.collectionName,
      docId: this.docId,
      version: this.version()
    }
    this.sendOp(op, channel)
  }

  addChannel (channel) {
    if (this.channels.indexOf(channel) === -1) this.channels.push(channel)
  }

  sendOp (op, channel) {
    this.store.sendOp(op, channel)
  }
}

export default ServerDoc
