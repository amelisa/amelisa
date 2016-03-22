let debug = require('debug')('RemoteQuery')
import ClientQuery from './ClientQuery'

class RemoteQuery extends ClientQuery {
  constructor (collectionName, expression, model, collection, querySet) {
    super(collectionName, expression, model, collection, querySet)
    this.subscribed = 0
    this.subscribing = false
  }

  async fetch () {
    if (this.subscribing) return this.subscribingPromise
    this.subscribing = true

    let op = {
      type: 'qfetch',
      collectionName: this.collection.name,
      expression: this.expression
    }

    if (this.isDocs) {
      if (!this.refreshed) super.refresh()
      op.docIds = this.data
    }

    this.subscribingPromise = this.model.sendOp(op)
    return this.subscribingPromise
  }

  onSnapshotNotDocs (data) {
    debug('onSnapshotNotDocs', this.data, data)
    this.refreshDataFromServer(data)
  }

  onDiff (diffs, docOps) {
    debug('onDiff', this.data, diffs, docOps)
    this.attachDocsToCollection(docOps)

    let docIds = this.applyDiffs(diffs)

    this.refreshDataFromServer(docIds)
  }

  applyDiffs (diffs) {
    let docIds = this.lastServerData || this.data

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
    this.lastServerData = data
    this.data = data

    this.subscribing = false
    this.emit('change')
  }

  refresh (op) {
    debug('refresh', op ? op.type : null, this.model.online, this.isServerOnly)

    if (this.model.online && this.isServerOnly) return

    let prevData = this.data
    super.refresh()
    if (this.dataHasChanged(prevData, this.data)) {
      this.emit('change')
    }
  }

  async subscribe () {
    this.subscribed++
    debug('subscribe', this.subscribed)
    if (this.subscribing) return this.subscribingPromise
    this.subscribing = true
    if (this.subscribed !== 1) return

    this.collection.on('change', this.onCollectionChange)

    if (!this.isServerOnly) {
      super.refresh()
      this.lastServerData = this.data
      // return immediately if there is data in collection
      if (Object.keys(this.collection.data).length) {
        this.sendSubscribeOp()
        return
      }
    }

    return this.sendSubscribeOp()
  }

  async sendSubscribeOp () {
    let op = {
      type: 'qsub',
      collectionName: this.collectionName,
      expression: this.expression
    }

    if (this.isDocs) op.docIds = this.data

    this.subscribingPromise = this.model.sendOp(op)
    return this.subscribingPromise
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
    this.lastServerData = this.data

    return data
  }
}

export default RemoteQuery
