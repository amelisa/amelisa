let debug = require('debug')('RemoteQuery')
import ClientQuery from './ClientQuery'

class RemoteQuery extends ClientQuery {
  constructor (collectionName, expression, model, collection, querySet, storage) {
    super(collectionName, expression, model, collection, querySet)
    this.storage = storage
    this.server = false
    this.subscribed = 0
    this.timestamp = null
    this.versionDiffs = {}
  }

  fetch () {
    return this.model.sendOp({
      type: 'qfetch',
      collectionName: this.collection.name,
      expression: this.expression
    })
  }

  init (docs, version) {
    debug('init', this.data, docs, version)
    let [timestamp, versionNumber] = version.split('|')
    if (+timestamp < this.timestamp) {
      return console.error(`init timestamps does not match for ${this.collectionName} ${timestamp} ${this.timestamp}`)
    } else if (+timestamp > this.timestamp) {
      this.timestamp = +timestamp
      this.versionDiffs = {}
    }

    this.versionDiffs[+versionNumber] = {init: true, docs}
    this.attachDocsToCollection(docs)
    // super.init(docs)
    this.refreshFromVersionDiffs()
    this.server = true
  }

  onDiff (diffs, version) {
    debug('onDiff', this.data, diffs, version, this.server)

    let [timestamp, versionNumber] = version.split('|')
    if (+timestamp < this.timestamp) {
      return console.error(`onDiff timestamps does not match for ${this.collectionName} ${timestamp} ${this.timestamp}`)
    } else if (+timestamp > this.timestamp) {
      this.timestamp = +timestamp
      this.versionDiffs = {}
    }

    this.versionDiffs[+versionNumber] = {diff: true, diffs}

    this.refreshFromVersionDiffs()
    this.server = true
    this.emit('change')
  }

  refreshFromVersionDiffs () {
    let docs = this.data

    for (let versionNumber in this.versionDiffs) {
      let versionDiff = this.versionDiffs[versionNumber]

      if (versionDiff.init) {
        if (this.isDocs) {
          docs = versionDiff.docs.slice(0)
        } else {
          docs = versionDiff.docs
        }
      } else {
        for (let diff of versionDiff.diffs) {
          switch (diff.type) {
            case 'insert':
              let before = docs.slice(0, diff.index)
              let after = docs.slice(diff.index)
              docs = before.concat(diff.values, after)

              this.attachDocsToCollection(diff.values)
              break

            case 'move':
              let move = docs.splice(diff.from, diff.howMany)
              docs.splice.apply(docs, [diff.to, 0].concat(move))
              break

            case 'remove':
              docs.splice(diff.index, diff.howMany)
              break
          }
        }
      }
    }

    this.data = docs

    this.emit('change')
  }

  refresh (op) {
    debug('refresh', op ? op.type : null, this.server, this.model.online)

    // Refresh queries from local data when offline
    if (this.server && !this.model.online) this.server = false

    if (this.server) {
      if (op && (op.type === 'add' || (op.type === 'del' && !op.field))) return

      let docs = []
      debug('docs', this.data)
      if (this.isDocs) {
        for (let docData of this.data) {
          let doc = this.collection.getDoc(docData._id)
          docs.push(doc.get())
        }
        this.data = docs
      }
    } else {
      super.refresh()
    }
    // TODO: emit only if there were changes
    this.emit('change')
  }

  subscribe () {
    this.subscribed++
    debug('subscribe', this.subscribed)
    if (this.subscribed !== 1) return Promise.resolve()

    return this.model.sendOp({
      type: 'qsub',
      collectionName: this.collectionName,
      expression: this.expression
    })
  }

  unsubscribe () {
    this.subscribed--
    debug('unsubscribe', this.subscribed)
    if (this.subscribed !== 0) return Promise.resolve()

    return this.model.sendOp({
      type: 'qunsub',
      collectionName: this.collectionName,
      expression: this.expression
    })
  }

  getSyncData () {
    // TODO: query version
    let data = {
      collectionName: this.collectionName,
      expression: this.expression,
      subscribed: !!this.subscribed
    }

    return data
  }

  sync () {
    return this.model.sendOp({
      type: 'qsync',
      collectionName: this.collectionName,
      expression: this.expression
    })
  }
}

export default RemoteQuery
