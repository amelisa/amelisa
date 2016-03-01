let debug = require('debug')('RemoteQuery')
import ClientQuery from './ClientQuery'

class RemoteQuery extends ClientQuery {
  constructor (collectionName, expression, model, collection, querySet) {
    super(collectionName, expression, model, collection, querySet)
    this.server = false
    this.subscribed = 0
    if (!model.online) this.refresh()
  }

  async fetch () {
    let op = {
      type: 'qfetch',
      collectionName: this.collection.name,
      expression: this.expression
    }

    if (this.isDocs) op.docIds = this.data

    return this.model.sendOp(op)
  }

  onSnapshotNotDocs (data) {
    debug('onSnapshotNotDocs', this.data, data)
    this.refreshDataFromServer(data)
  }

  onSnapshotDocs (docIds, docOps) {
    debug('onSnapshotDocs', this.data, docIds, docOps)
    this.attachDocsToCollection(docOps)

    this.refreshDataFromServer(docIds)
  }

  onDiff (diffs, docOps) {
    debug('onDiff', this.data, diffs, docOps, this.server)
    this.attachDocsToCollection(docOps)

    let docIds = this.applyDiffs(diffs)

    this.refreshDataFromServer(docIds)
  }

  applyDiffs (diffs) {
    let docIds = this.data

    for (let diff of diffs) {
      switch (diff.type) {
        case 'insert':
          let before = docIds.slice(0, diff.index)
          let after = docIds.slice(diff.index)
          docIds = before.concat(diff.values, after)
          break

        case 'move':
          let move = docIds.splice(diff.from, diff.howMany)
          docIds.splice.apply(docIds, [diff.to, 0].concat(move))
          break

        case 'remove':
          docIds.splice(diff.index, diff.howMany)
          break
      }
    }

    return docIds
  }

  refreshDataFromServer (data) {
    this.data = data

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

  async subscribe () {
    this.subscribed++
    debug('subscribe', this.subscribed)
    if (this.subscribed !== 1) return

    this.collection.on('change', this.onCollectionChange)

    let op = {
      type: 'qsub',
      collectionName: this.collectionName,
      expression: this.expression
    }

    if (this.isDocs) op.docIds = this.data

    return this.model.sendOp(op)
  }

  async unsubscribe () {
    this.subscribed--
    debug('unsubscribe', this.subscribed)
    if (this.subscribed !== 0) return

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
      expression: this.expression
    }

    if (this.isDocs) data.docIds = this.data

    return data
  }
}

export default RemoteQuery
