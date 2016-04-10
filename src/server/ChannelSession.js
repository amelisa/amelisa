import Doc from '../client/Doc'

class ChannelSession {
  constructor () {
    this.collections = {}
  }

  getDocVersion (collectionName, docId) {
    let collection = this.collections[collectionName]
    return collection && collection[docId]
  }

  saveDocVersion (collectionName, docId, version) {
    let collection = this.collections[collectionName] || (this.collections[collectionName] = {})
    collection[docId] = version
  }

  updateDocVersion (collectionName, docId, source, date) {
    let version = this.getDocVersion(collectionName, docId)

    let map = Doc.prototype.getMapFromVersion(version)

    map[source] = date

    let versions = []
    for (let source in map) {
      let date = map[source]
      versions.push(source + ' ' + date)
    }

    this.saveDocVersion(collectionName, docId, versions.join('|'))
  }
}

export default ChannelSession
