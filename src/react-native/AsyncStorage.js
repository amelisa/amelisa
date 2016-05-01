import { AsyncStorage as AsyncNativeStorage } from 'react-native'

class AsyncStorage {
  constructor (collectionNames = []) {
    this.data = {}
    this.collectionNames = collectionNames
  }

  async getCollectionNames () {
    return this.existingCollectionNames
  }

  async getExistingCollectionNames () {
    return AsyncNativeStorage.getAllKeys()
  }

  async init () {
    for (let collectionName of this.collectionNames) {
      let collection = await AsyncNativeStorage.getItem(collectionName)
      if (collection) collection = JSON.parse(collection)
      this.data[collectionName] = collection || {}
    }

    let existingCollectionNames = await this.getExistingCollectionNames()
    this.existingCollectionNames = existingCollectionNames

    // for (let collectionName of existingCollectionNames) {
    //   if (this.collectionNames.indexOf(collectionName) > -1) continue
    //   await this.removeCollection(collectionName)
    // }
  }

  async clear () {
    await AsyncNativeStorage.clear()
  }

  getOrCreateCollection (collectionName) {
    let collection = this.data[collectionName]
    if (!collection) collection = this.data[collectionName] = {}
    return collection
  }

  async getAllDocs (collectionName) {
    let collection = this.getOrCreateCollection(collectionName)

    let docs = []
    for (let docId in collection) {
      docs.push(collection[docId])
    }

    return docs
  }

  async saveDoc (collectionName, docId, ops, serverVersion) {
    let doc = {
      id: docId,
      _ops: ops,
      _sv: serverVersion
    }

    let collection = this.getOrCreateCollection(collectionName)
    collection[docId] = doc

    collection = JSON.stringify(collection)
    await AsyncNativeStorage.setItem(collectionName, collection)
  }
}

export default AsyncStorage
