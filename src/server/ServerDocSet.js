let debug = require('debug')('ServerDocSet')
import eventToPromise from 'event-to-promise'
import ProjectedDoc from './ProjectedDoc'
import ServerDoc from './ServerDoc'

class ServerDocSet {
  constructor (store) {
    this.store = store
    this.data = {}
  }

  getDocPath (collectionName, docId) {
    return collectionName + '_' + docId
  }

  async getOrCreateDoc (collectionName, docId) {
    let docPath = this.getDocPath(collectionName, docId)
    let doc = this.data[docPath]

    if (!doc) {
      let projection = this.store.projections[collectionName]
      if (projection) {
        doc = new ProjectedDoc(collectionName, projection, docId, [], this.store, this)
      } else {
        doc = new ServerDoc(collectionName, docId, [], this.store, this)
      }
      this.data[docPath] = doc
    }

    if (doc.loaded) return doc

    await eventToPromise(doc, 'loaded')

    return doc
  }

  unattach (collectionName, docId) {
    // debug('unattach', collectionName, docId)
    let docPath = this.getDocPath(collectionName, docId)
    delete this.data[docPath]
  }

  channelClose (channel) {
    for (let docPath in this.data) {
      let doc = this.data[docPath]

      doc.unsubscribe(channel)
    }
  }

  onOp (op) {
    debug('onOp', op.type)
    // TODO: find more effective way to send op to all projected docs
    for (let hash in this.data) {
      let doc = this.data[hash]
      if ((doc.docId === op.docId) &&
        (doc.collectionName === op.collectionName ||
        doc.projectionCollectionName === op.collectionName)) {
        if (doc.ops.find((docOp) => docOp._id === op._id)) continue

        if (doc.loading) {
          doc.once('loaded', () => {
            doc.onOp(op)
          })
        } else {
          doc.onOp(op)
        }
      }
    }
  }
}

export default ServerDocSet
