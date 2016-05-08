import Collection from './Collection'
import RemoteDoc from './RemoteDoc'

class RemoteCollection extends Collection {
  async add (docId, docData) {
    let doc = super.add(docId, docData)
    doc.save()
    let op = doc.ops[doc.ops.length - 1]
    await this.model.send(op)
    if (!this.model.online) return
    doc.serverVersion = doc.addOpToVersion(doc.serverVersion, op)
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
