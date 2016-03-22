import Collection from './Collection'
import RemoteDoc from './RemoteDoc'

class RemoteCollection extends Collection {
  constructor (name, data, model) {
    super(name, data, model)
  }

  async add (docId, docData) {
    let doc = super.add(docId, docData)
    doc.save()
    let op = doc.ops[doc.ops.length - 1]
    return this.model.send(op)
  }

  attach (docId, ops, serverVersion) {
    let doc = new RemoteDoc(docId, ops, this, this.model, serverVersion)

    this.data[docId] = doc
    return doc
  }

  getSyncData () {
    let data = {}

    for (let docId in this.data) {
      let doc = this.data[docId]
      let syncDocData = doc.getSyncData()
      if (syncDocData.version !== undefined || syncDocData.ops.length) {
        data[docId] = syncDocData
      }
    }

    return data
  }
}

export default RemoteCollection
