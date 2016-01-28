let debug = require('debug')('RemoteQuery')
import ClientQuery from './ClientQuery'

class RemoteQuery extends ClientQuery {
  constructor (collectionName, expression, model, collection, querySet) {
    super(collectionName, expression, model, collection, querySet)
    this.server = false
    this.subscribed = 0
    this.timestamp = null
    this.versionDiffs = {}
  }

  fetch () {
    let op = {
      type: 'qfetch',
      collectionName: this.collection.name,
      expression: this.expression
    }

    if (this.isDocs) {
      let ids = this.getDataFromVersionDiffs()
      op.ids = ids
      op.docVersions = ids.map((docId) => this.collection.getDoc(docId).version())
    }

    return this.model.sendOp(op)
  }

  onSnapshotNotDocs (data, version) {
    let [timestamp, versionNumber] = version.split('|')
    if (+timestamp < this.timestamp) {
      return console.error(`onSnapshotNotDocs timestamps does not match for ${this.collectionName} ${timestamp} ${this.timestamp}`)
    } else if (+timestamp > this.timestamp) {
      this.timestamp = +timestamp
      this.versionDiffs = {}
    }

    this.versionDiffs[+versionNumber] = {snapshot: true, data}
    this.refreshFromVersionDiffs()
  }

  onSnapshotDocs (ids, docs, version) {
    debug('onSnapshotDocs', this.data, ids, docs, version)
    let [timestamp, versionNumber] = version.split('|')
    if (+timestamp < this.timestamp) {
      return console.error(`onSnapshotDocs timestamps does not match for ${this.collectionName} ${timestamp} ${this.timestamp}`)
    } else if (+timestamp > this.timestamp) {
      this.timestamp = +timestamp
      this.versionDiffs = {}
    }

    this.versionDiffs[+versionNumber] = {snapshot: true, ids}
    this.attachDocsToCollection(docs)

    this.refreshFromVersionDiffs()
  }

  onDiff (diffs, docs, version) {
    debug('onDiff', this.data, diffs, version, this.server)

    let [timestamp, versionNumber] = version.split('|')
    if (+timestamp < this.timestamp) {
      return console.error(`onDiff timestamps does not match for ${this.collectionName} ${timestamp} ${this.timestamp}`)
    } else if (+timestamp > this.timestamp) {
      this.timestamp = +timestamp
      this.versionDiffs = {}
    }

    this.versionDiffs[+versionNumber] = {diff: true, diffs}
    this.attachDocsToCollection(docs)

    this.refreshFromVersionDiffs()
  }

  getDataFromVersionDiffs () {
    let ids = this.data

    for (let versionNumber in this.versionDiffs) {
      let versionDiff = this.versionDiffs[versionNumber]

      if (versionDiff.snapshot) {
        if (this.isDocs) {
          ids = versionDiff.ids.slice(0)
        } else {
          ids = versionDiff.data
        }
      } else {
        for (let diff of versionDiff.diffs) {
          switch (diff.type) {
            case 'insert':
              let before = ids.slice(0, diff.index)
              let after = ids.slice(diff.index)
              ids = before.concat(diff.values, after)
              break

            case 'move':
              let move = ids.splice(diff.from, diff.howMany)
              ids.splice.apply(ids, [diff.to, 0].concat(move))
              break

            case 'remove':
              ids.splice(diff.index, diff.howMany)
              break
          }
        }
      }
    }

    return ids
  }

  refreshFromVersionDiffs () {
    let ids = this.getDataFromVersionDiffs()

    this.data = ids

    this.server = true
    this.emit('change')
  }

  refresh (op) {
    debug('refresh', op ? op.type : null, this.server, this.model.online)

    // Refresh queries from local data when offline
    if (this.server && !this.model.online) this.server = false

    if (!this.server) {
      super.refresh()
    }
    // TODO: emit only if there were changes
    this.emit('change')
  }

  subscribe () {
    this.subscribed++
    debug('subscribe', this.subscribed)
    if (this.subscribed !== 1) return Promise.resolve()

    this.collection.on('change', this.onCollectionChange)

    let op = {
      type: 'qsub',
      collectionName: this.collectionName,
      expression: this.expression
    }

    if (this.isDocs) {
      let ids = this.getDataFromVersionDiffs()
      op.ids = ids
      op.docVersions = ids.map((docId) => this.collection.getDoc(docId).version())
    }

    return this.model.sendOp(op)
  }

  unsubscribe () {
    this.subscribed--
    debug('unsubscribe', this.subscribed)
    if (this.subscribed !== 0) return Promise.resolve()

    this.collection.removeListener('change', this.onCollectionChange)

    return this.model.sendOp({
      type: 'qunsub',
      collectionName: this.collectionName,
      expression: this.expression
    })
  }

  getSyncData () {
    let data = {
      collectionName: this.collectionName,
      expression: this.expression,
      subscribed: !!this.subscribed
    }

    if (this.isDocs) {
      let ids = this.getDataFromVersionDiffs()
      data.ids = ids
      data.docVersions = ids.map((docId) => this.collection.getDoc(docId).version())
    }

    return data
  }
}

export default RemoteQuery
