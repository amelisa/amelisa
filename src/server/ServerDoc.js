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

    // debug('load', this.collectionName, this.docId)

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

  onOp (op) {
    // debug('onOp')
    this.applyOp(op)
    this.save()
    this.broadcast()
  }

  onPubSubOp (op) {
    this.applyOp(op)
    this.broadcast()
  }

  save () {
    if (!this.loaded) return

    // debug('save', this.ops.length)

    if (this.ops.length === 0) return

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
    channel._session.subscribeDoc(this.collectionName, this.docId, version)
    this.channels.push(channel)
  }

  subscribe (channel, version, ackId) {
    channel._session.subscribeDoc(this.collectionName, this.docId, version)
    this.channels.push(channel)

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
        this.docSet.unattach(this.collectionName, this.docId)
      }
    }, this.store.options.unattachTimeout)
  }

  sync (channel, version, resubscribe) {
    if (resubscribe) {
      channel._session.subscribeDoc(this.collectionName, this.docId, version)
      this.channels.push(channel)
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

  sendOp (op, channel) {
    this.store.sendOp(op, channel)
  }
}

export default ServerDoc
