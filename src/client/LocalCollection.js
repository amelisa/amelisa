import Collection from './Collection'
import LocalDoc from './LocalDoc'

class LocalCollection extends Collection {
  async add (docId, docData) {
    super.add(docId, docData)
  }

  attach (docId, ops) {
    let doc = new LocalDoc(docId, ops, this, this.model)

    this.data[docId] = doc
    return doc
  }
}

export default LocalCollection
