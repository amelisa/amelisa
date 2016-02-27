let debug = require('debug')('ServerQuery')
import arraydiff from 'arraydiff'
import Query from '../client/Query'
import { arrayRemove, deepClone, fastEqual } from '../util'

const unattachTimeout = 5000

class ServerQuery extends Query {
  constructor (collectionName, expression, store, querySet) {
    super(collectionName, expression)
    this.originalExpression = deepClone(expression)
    this.store = store
    this.querySet = querySet
    this.loaded = false
    this.loading = false
    this.channels = []
    this.timestamp = Date.now()
    this.versionNumber = 0

    this.load()
    this.on('loaded', () => {
      this.broadcast()
    })
  }

  load () {
    // TODO: can be race condition. should load one more time
    if (this.loading) return
    this.loading = true

    debug('load', this.collectionName, this.expression)

    this.store.storage
      .getDocsByQuery(this.collectionName, this.expression)
      .then((docs) => {
        debug('loaded', this.collectionName, this.expression, docs)
        this.prev = this.data
        this.data = docs
        this.loading = false
        this.loaded = true
        this.versionNumber++
        this.emit('loaded')
      })
      .catch((err) => {
        console.error('ServerQuery.load', err, err.stack)
      })
  }

  broadcast () {
    debug('broadcast', this.projectionCollectionName, this.collectionName, this.expression, this.channels.length)

    if (!this.isDocs) {
      if (fastEqual(this.prev, this.data)) return

      for (let channel of this.channels) {
        this.sendNotDocsQuerySnapshotToChannel(channel)
      }
      return
    }

    let diffs = this.getDiffs(this.prev, this.data)

    for (let channel of this.channels) {
      this.sendDiffQueryToChannel(channel, diffs)
    }
  }

  sendNotDocsQuerySnapshotToChannel (channel, opId) {
    let op = {
      type: 'q',
      collectionName: this.collectionName,
      expression: this.originalExpression,
      version: this.version(),
      value: this.data,
      ackId: opId
    }

    this.sendOp(op, channel)
  }

  async sendDocsQuerySnapshotToChannel (channel, opId) {
    let docs = this.getDocs()

    let op = {
      type: 'q',
      collectionName: this.collectionName,
      expression: this.originalExpression,
      version: this.version(),
      ids: this.getIds(),
      docs,
      ackId: opId
    }

    this.sendOp(op, channel)

    await this.subscribeDocs(docs, channel)
  }

  getDocs () {
    let docs = {}

    for (let doc of this.data) {
      docs[doc._id] = doc._ops
    }

    return docs
  }

  getIds () {
    return this.data.map((doc) => doc._id)
  }

  async sendDiffQueryToChannel (channel, diffs) {
    if (!diffs.length) return

    let docMap = {}
    for (let doc of this.data) {
      docMap[doc._id] = doc
    }

    let docs = {}

    for (let diff of diffs) {
      if (diff.type === 'insert') {
        for (let docId of diff.values) {
          docs[docId] = docMap[docId]._ops
        }
      }
    }

    let op = {
      type: 'qdiff',
      collectionName: this.collectionName,
      expression: this.originalExpression,
      version: this.version(),
      diffs: diffs,
      docs: docs
    }

    this.sendOp(op, channel)

    await this.subscribeDocs(docs, channel)
  }

  getDiffs (prev, data) {
    let prevIds = prev.map((doc) => doc._id)
    let docIds = data.map((doc) => doc._id)

    return arraydiff(prevIds, docIds)
  }

  async subscribeDocs (docs, channel) {
    let docPromises = []
    for (let docId in docs) {
      let docData = docs[docId]
      let docPromise = this.store.docSet
        .getOrCreateDoc(this.collectionName, docData._id)
        .then((doc) => {
          doc.subscribe(channel, docData._v)
        })
      docPromises.push(docPromise)
    }
    await Promise.all(docPromises)
  }

  async fetch (channel, opId) {
    await this.sendQuery(channel, opId)

    this.maybeUnattach()
  }

  async subscribe (channel, opId) {
    this.channels.push(channel)

    if (!opId) return

    await this.sendQuery(channel, opId)
  }

  async sendQuery (channel, opId) {
    if (this.isDocs) {
      await this.sendDocsQuerySnapshotToChannel(channel, opId)
    } else {
      await this.sendNotDocsQuerySnapshotToChannel(channel, opId)
    }
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
    }, unattachTimeout)
  }

  destroy () {
    this.querySet.unattach(this.collectionName, this.expression)
  }

  sync (channel) {
    this.channels.push(channel)

    if (this.loaded) {
      this.sendDocsQuerySnapshotToChannel(channel)
    }
  }

  sendOp (op, channel) {
    this.store.sendOp(op, channel)
  }

  version () {
    return this.timestamp + '|' + this.versionNumber
  }
}

export default ServerQuery
