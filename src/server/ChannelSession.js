class ChannelSession {
  constructor () {
    this.collections = {}
  }

  saveDocVersion (collectionName, docId, version) {
    let collection = this.collections[collectionName] || (this.collections[collectionName] = {})
    collection[docId] = version
  }

  getDocVersion (collectionName, docId) {
    let collection = this.collections[collectionName]
    return collection && collection[docId]
  }
}

export default ChannelSession
