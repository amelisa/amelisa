let debug = require('debug')('ServerDocSet')
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

  getOrCreateDoc (collectionName, docId) {
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

    return new Promise((resolve, reject) => {
      if (doc.loaded) return resolve(doc)

      doc.once('loaded', () => {
        resolve(doc)
      })
    })
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
    for (let hash in this.data) {
      let doc = this.data[hash]
      if ((doc.docId === op.docId) &&
        (doc.collectionName === op.collectionName ||
        doc.projectionCollectionName === op.collectionName)) {
        // if doc is loading now, we need to load it one more time with new data
        if (doc.loading) {
          doc.once('loaded', () => {
            doc.load()
          })
        } else {
          doc.load()
        }
      }
    }
  }
}

export default ServerDocSet
