let debug = require('debug')('Collection')
import { EventEmitter } from 'events'
import Doc from './Doc'

class Collection extends EventEmitter {
  constructor (name, data = {}, model) {
    super()
    this.name = name
    this.data = data
    this.model = model

    // all collection queries listen to collection change event
    this.setMaxListeners(0)
  }

  get (docId, field) {
    if (!docId) {
      let state = {}
      for (let docId in this.data) {
        state[docId] = this.data[docId].get()
      }
      return state
    }

    let doc = this.data[docId]
    if (doc) return doc.get(field)
  }

  getDoc (docId) {
    return this.data[docId]
  }

  getDocs () {
    let docs = []
    for (let docId in this.data) {
      let doc = this.data[docId].get()
      if (doc) docs.push(doc)
    }
    return docs
  }

  add (docId, docData) {
    let op = this.model.createOp({
      type: 'add',
      collectionName: this.name,
      docId,
      value: docData
    })

    let doc = this.getDoc(docId)
    if (!doc) doc = this.attach(docId, [])
    doc.applyOp(op)
    debug('emit change on add')
    doc.emit('change')
    this.emit('change', op)
    return doc
  }

  unattach (docId) {
    delete this.data[docId]
  }

  bundle () {
    let data = {}

    for (let docId in this.data) {
      let doc = this.data[docId]
      data[docId] = doc.bundle()
    }

    return data
  }

  unbundle (data) {
    for (let docId in data) {
      let {ops} = data[docId]
      let serverVersion = Doc.prototype.getVersionFromOps(ops)
      let doc = this.applyOpsOrAttach(docId, ops, serverVersion)
      doc.save()
    }
  }

  async fillFromClientStorage () {
    return new Promise((resolve, reject) => {
      this.model.storage
        .getAllDocs(this.name)
        .then((docs) => {
          for (let doc of docs) {
            this.applyOpsOrAttach(doc._id, doc._ops, doc._sv)
          }
          resolve()
        })
        .catch((err) => {
          console.error('Collection.fillFromClientStorage', this.name, err)

          // TODO: remove collection if was not able to read from it
          // Resolve anyway
          resolve()
        })
    })
  }

  applyOpsOrAttach (docId, ops, serverVersion) {
    let doc = this.getDoc(docId)
    if (doc) {
      doc.applyOps(ops)
      doc.serverVersion = serverVersion
    } else {
      doc = this.attach(docId, ops, serverVersion)
    }
    return doc
  }
}

export default Collection
