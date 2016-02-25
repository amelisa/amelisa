import { AsyncStorage as AsyncNativeStorage } from 'react-native'
import MongoQueries from '../MongoQueries'

class AsyncStorage extends MongoQueries {
  constructor (collectionNames = []) {
    super()

    this.data = {}
    this.collectionNames = collectionNames
  }

  getCollectionNames = async () => {
    return this.collectionNames
  };

  async init () {
    for (let collectionName of this.collectionNames) {
      let collection = await AsyncNativeStorage.getItem(collectionName)
      if (collection) collection = JSON.parse(collection)
      this.data[collectionName] = collection || {}
    }
  }

  async clear () {
    await AsyncNativeStorage.clear()
  }

  getOrCreateCollection (collectionName) {
    let collection = this.data[collectionName]
    if (!collection) collection = this.data[collectionName] = {}
    return collection
  }

  async getDocById (collectionName, docId) {
    let collection = this.getOrCreateCollection(collectionName)

    return collection[docId]
  }

  async getAllDocs (collectionName) {
    return this.getDocsByQuery(collectionName, MongoQueries.allSelector)
  }

  async getDocsByQuery (collectionName, expression) {
    let collection = this.getOrCreateCollection(collectionName)

    let allDocs = []
    for (let docId in collection) {
      allDocs.push(collection[docId])
    }

    let docs = this.getQueryResultFromArray(allDocs, expression)

    return docs
  }

  async saveDoc (collectionName, docId, state, prevVersion, version, ops) {
    let doc = {
      _id: docId,
      _v: version,
      _sv: prevVersion,
      _ops: ops
    }

    for (let key in state) {
      doc[key] = state[key]
    }

    let collection = this.getOrCreateCollection(collectionName)
    collection[docId] = doc

    collection = JSON.stringify(collection)
    await AsyncNativeStorage.setItem(collectionName, collection)
  }
}

export default AsyncStorage
