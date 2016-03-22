import eventToPromise from 'event-to-promise'
import ProjectedDoc from './ProjectedDoc'
import ServerDoc from './ServerDoc'

class ServerDocSet {
  constructor (store) {
    this.store = store
    this.data = {}
  }

  async getOrCreateDoc (collectionName, docId) {
    let hash = this.getDocHash(collectionName, docId)
    let doc = this.data[hash]

    if (!doc) {
      let projection = this.store.projections[collectionName]
      if (projection) {
        doc = new ProjectedDoc(collectionName, projection, docId, [], this.store, this)
      } else {
        doc = new ServerDoc(collectionName, docId, [], this.store, this)
      }
      this.data[hash] = doc
    }

    if (doc.loaded) return doc

    await eventToPromise(doc, 'loaded')

    return doc
  }

  unattach (collectionName, docId) {
    let hash = this.getDocHash(collectionName, docId)
    delete this.data[hash]
  }

  channelClose (channel) {
    for (let hash in this.data) {
      let doc = this.data[hash]

      doc.unsubscribe(channel)
    }
  }

  onOp (op) {
    let { collectionName, docId } = op

    let dbCollectionName
    let collectionNames = []

    let projection = this.store.projections[collectionName]
    if (projection) {
      dbCollectionName = projection.dbCollectionName
    }

    for (let projectionCollectionName in this.store.projections) {
      let projection = this.store.projections[projectionCollectionName]
      // op is on db collection
      if (!dbCollectionName && projection.dbCollectionName === collectionName) {
        collectionNames.push(projectionCollectionName)
      }
      // op is on projected collection
      if (dbCollectionName && projection.dbCollectionName === dbCollectionName) {
        if (projectionCollectionName === collectionName) continue
        collectionNames.push(projectionCollectionName)
      }
    }

    this.receiveOpToCollectionNames(op, collectionNames, docId)
  }

  onPubsubOp (op) {
    let { collectionName, docId } = op

    let dbCollectionName
    let collectionNames = []

    let projection = this.store.projections[collectionName]
    if (projection) {
      dbCollectionName = projection.dbCollectionName
    }

    for (let projectionCollectionName in this.store.projections) {
      let projection = this.store.projections[projectionCollectionName]
      // op is on db collection
      if (!dbCollectionName && projection.dbCollectionName === collectionName) {
        collectionNames.push(projectionCollectionName)
      }
      // op is on projected collection
      if (dbCollectionName && projection.dbCollectionName === dbCollectionName) {
        collectionNames.push(projectionCollectionName)
      }
    }

    if (collectionNames.indexOf(collectionName) === -1) collectionNames.push(collectionName)

    this.receiveOpToCollectionNames(op, collectionNames, docId)
  }

  receiveOpToCollectionNames (op, collectionNames, docId) {
    for (let collectionName of collectionNames) {
      let hash = this.getDocHash(collectionName, docId)
      let doc = this.data[hash]
      if (!doc) continue

      // if (doc.ops.find((docOp) => docOp._id === op.id)) continue

      if (doc.loading) {
        doc.once('loaded', () => {
          doc.receiveOp(op)
        })
      } else {
        doc.receiveOp(op)
      }
    }
  }

  getDocHash (collectionName, docId) {
    return collectionName + '_' + docId
  }
}

export default ServerDocSet
