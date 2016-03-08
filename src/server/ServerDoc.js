let debug = require('debug')('ServerDoc')
import Doc from '../client/Doc'
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
  }

  load () {
    if (this.loading) return
    this.loading = true

    debug('load', this.collectionName, this.docId)

    this.store.storage
      .getDocById(this.collectionName, this.docId)
      .then((doc) => {
        // debug('loaded', this.collectionName, this.docId)
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

  onOp (op, channel) {
    // debug('onOp')
    this.ops.push(op)
    this.save()
    this.broadcastOp(op, channel)
  }

  onPubSubOp (op) {
    this.ops.push(op)
    this.broadcastOp(op)
  }

  save () {
    if (!this.loaded) return
    if (this.ops.length === 0) return

    if (this.timeout) clearTimeout(this.timeout)
    this.timeout = setTimeout(() => this.saveToStorage(), this.store.options.saveDebounceTimeout)
  }

  saveToStorage () {
    this.distillOps()
    this.refreshState()

    let version = this.version()

    this.store.storage
      .saveDoc(this.collectionName, this.docId, this.state, this.prevVersion, version, this.ops)
      .then(() => {
        this.emit('saved')
        this.prevVersion = version
        // debug('saved', this.collectionName, this.docId)
      })
      .catch((err) => {
        if (err === 'version changed') {
          this.once('loaded', this.save().bind(this))
          return this.load()
        } else if (err.code === 11000) {
          // E11000 duplicate key error collection
        } else {
          console.error('ServerDoc.save', err)
        }
      })
  }

  broadcast () {
    debug('broadcast', this.projectionCollectionName, this.collectionName, this.docId, this.channels.length)
    for (let channel of this.channels) {
      this.sendOpsToChannel(channel)
    }
  }

  broadcastOp (op, fromChannel) {
    for (let channel of this.channels) {
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
    debug('subscribe')
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
    debug('unsubscribe')
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
