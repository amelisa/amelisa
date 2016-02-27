let debug = require('debug')('ServerQuery')
import arraydiff from 'arraydiff'
import Query from '../client/Query'
import { arrayRemove, deepClone, fastEqual } from '../util'

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

  sendNotDocsQuerySnapshotToChannel (channel, ackId) {
    let op = {
      type: 'q',
      collectionName: this.collectionName,
      expression: this.originalExpression,
      version: this.version(),
      value: this.data,
      ackId
    }

    this.sendOp(op, channel)
  }

  async sendDocsQuerySnapshotToChannel (channel, ackId) {
    let { docIds, docOps, docVersions } = this.getDocsData()

    let op = {
      type: 'q',
      collectionName: this.collectionName,
      expression: this.originalExpression,
      version: this.version(),
      docIds,
      docOps,
      ackId
    }

    this.sendOp(op, channel)

    await this.subscribeDocs(docVersions, channel)
  }

  getDocsData () {
    let docIds = []
    let docOps = {}
    let docVersions = {}

    for (let doc of this.data) {
      let docId = doc._id
      docIds.push(docId)
      docOps[docId] = doc._ops
      docVersions[docId] = doc._v
    }

    return {
      docIds,
      docOps,
      docVersions
    }
  }

  async sendDiffQueryToChannel (channel, diffs) {
    if (!diffs.length) return

    let docMap = {}
    for (let doc of this.data) {
      docMap[doc._id] = doc
    }

    let docOps = {}
    let docVersions = {}

    for (let diff of diffs) {
      if (diff.type === 'insert') {
        for (let docId of diff.values) {
          docOps[docId] = docMap[docId]._ops
          docVersions[docId] = docMap[docId]._v
        }
      }
    }

    let op = {
      type: 'qdiff',
      collectionName: this.collectionName,
      expression: this.originalExpression,
      version: this.version(),
      diffs,
      docOps
    }

    this.sendOp(op, channel)

    await this.subscribeDocs(docVersions, channel)
  }

  getDiffs (prev, data) {
    let prevIds = prev.map((doc) => doc._id)
    let docIds = data.map((doc) => doc._id)

    return arraydiff(prevIds, docIds)
  }

  async subscribeDocs (docVersions, channel) {
    let docPromises = Object
      .keys(docVersions)
      .map((docId) => {
        let version = docVersions[docId]
        return this.store.docSet
          .getOrCreateDoc(this.collectionName, docId)
          .then((doc) => {
            doc.subscribe(channel, version)
          })
      })
    return Promise.all(docPromises)
  }

  async fetch (channel, ackId) {
    await this.sendQuery(channel, ackId)

    this.maybeUnattach()
  }

  async subscribe (channel, ackId) {
    this.channels.push(channel)

    if (!ackId) return

    await this.sendQuery(channel, ackId)
  }

  async sendQuery (channel, ackId) {
    if (this.isDocs) {
      await this.sendDocsQuerySnapshotToChannel(channel, ackId)
    } else {
      await this.sendNotDocsQuerySnapshotToChannel(channel, ackId)
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
    }, this.store.options.unattachTimeout)
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
