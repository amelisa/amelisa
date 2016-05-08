import arraydiff from 'arraydiff'
import Query from '../client/Query'
import { arrayRemove, deepClone, fastEqual } from '../util'

class ServerQuery extends Query {
  constructor (collectionName, expression, store, querySet) {
    super(collectionName, expression)

    this.expression = expression
    this.originalExpression = deepClone(expression)
    this.store = store
    this.querySet = querySet
    this.loaded = false
    this.loading = false
    this.channels = []
    this.isDocs = this.store.dbQueries.isDocsQuery(expression)

    this.load()

    this.on('loaded', () => {
      this.broadcast()
    })

    // Set max listeners to unlimited
    this.setMaxListeners(0)
  }

  get () {
    return this.getStatesFromDocs(this.data)
  }

  load () {
    // TODO: can be race condition. should load one more time
    if (this.loading) return
    this.loading = true

    this.store.storage
      .getDocsByQuery(this.collectionName, this.expression)
      .then((docs) => {
        this.prev = this.data
        this.data = docs
        this.emit('change')
        this.loading = false
        this.loaded = true
        this.emit('loaded')
      })
      .catch((err) => {
        console.error('ServerQuery.load', err, err.stack)
      })
  }

  broadcast () {
    if (!this.isDocs) {
      if (fastEqual(this.prev, this.data)) return

      for (let channel of this.channels) {
        this.sendNotDocsQuerySnapshotToChannel(channel)
      }
      return
    }

    let diffs = this.getDiffs(this.prev, this.data)

    if (!diffs.length) return

    for (let channel of this.channels) {
      this.sendDiffQueryToChannel(channel, diffs)
    }
  }

  sendNotDocsQuerySnapshotToChannel (channel, ackId) {
    let op = {
      type: 'q',
      collectionName: this.collectionName,
      expression: this.originalExpression,
      value: this.data,
      ackId
    }

    this.sendOp(op, channel)
  }

  getDocsData () {
    let docIds = []
    let docOps = {}
    let docVersions = {}

    for (let doc of this.data) {
      let docId = doc.id
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

  async sendDiffQueryToChannel (channel, diffs, ackId) {
    let docMap = {}
    for (let doc of this.data) {
      docMap[doc.id] = doc
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
      diffs,
      docOps,
      ackId
    }

    await this.subscribeDocs(docVersions, channel)

    this.sendOp(op, channel)
  }

  getDiffs (prev = [], data) {
    let prevIds = prev.map((doc) => doc.id)
    let docIds = data.map((doc) => doc.id)

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

  async fetch (channel, docIds, ackId) {
    await this.sendQuery(channel, docIds, ackId)

    this.maybeUnattach()
  }

  async subscribe (channel, docIds, ackId) {
    this.channels.push(channel)

    await this.sendQuery(channel, docIds, ackId)
  }

  async sendQuery (channel, docIds, ackId) {
    if (this.isDocs) {
      let diffs = this.getDiffs(docIds, this.data)
      await this.sendDiffQueryToChannel(channel, diffs, ackId)
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

  sendOp (op, channel) {
    this.store.sendOp(op, channel)
  }
}

export default ServerQuery
