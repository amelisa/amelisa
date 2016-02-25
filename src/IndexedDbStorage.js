let debug = require('debug')('IndexedDbStorage')
import MongoQueries from './MongoQueries'

const dbName = 'amelisa'

class IndexedDbStorage extends MongoQueries {
  constructor (collectionNames = [], version) {
    super()

    this.collectionNames = collectionNames
    this.version = version
  }

  getCollectionNames = async () => {
    return this.collectionNames
  };

  init () {
    return new Promise((resolve, reject) => {
      let request = window.indexedDB.open(dbName, this.version)
      request.onsuccess = (event) => {
        debug('onsuccess')
        this.db = event.target.result
        resolve(this)
      }
      request.onupgradeneeded = (event) => {
        debug('onupgradeneeded', event)
        let db = event.target.result
        db.onerror = (event) => {
          debug('onerror upgrage', event)
        }
        let prevCollectionNames = Array.from(db.objectStoreNames)
        for (let collectionName of this.collectionNames) {
          debug('collectionName', collectionName)
          if (prevCollectionNames.indexOf(collectionName) > -1) continue

          let objectStore = db.createObjectStore(collectionName, {keyPath: '_id'})
          objectStore.transaction.oncomplete = (e) => {
            debug('oncomplete', e)
            // TODO: handle it
          }
          objectStore.transaction.onerror = (e) => {
            debug('onerror', e)
          }
        }
      }
      request.onerror = (event) => {
        debug('onerror', event)
        reject(event.target.webkitErrorMessage || event.target.error)
      }
    })
  }

  getObjectStore (collectionName, transactionType) {
    if (Array.from(this.db.objectStoreNames).indexOf(collectionName) === -1) {
      debug('No colleciton ' + collectionName + ' in IndexedDB')
    }
    let transaction = this.db.transaction(collectionName, transactionType)
    return transaction.objectStore(collectionName)
  }

  getDocById (collectionName, docId) {
    return new Promise((resolve, reject) => {
      let objectStore = this.getObjectStore(collectionName, 'readonly')
      let request = objectStore.get(docId)
      request.onsuccess = (event) => {
        resolve(event.target.result)
      }
      request.onerror = (event) => {
        reject(event.target.webkitErrorMessage || event.target.error)
      }
    })
  }

  getAllDocs (collectionName) {
    return this.getDocsByQuery(collectionName, MongoQueries.allSelector)
  }

  getDocsByQuery (collectionName, expression) {
    return new Promise((resolve, reject) => {
      let allDocs = []
      let objectStore = this.getObjectStore(collectionName, 'readonly')

      let request = objectStore.openCursor()
      request.onsuccess = (event) => {
        var cursor = event.target.result
        if (cursor) {
          allDocs.push(cursor.value)
          cursor.continue()
        } else {
          let docs = this.getQueryResultFromArray(allDocs, expression)
          resolve(docs)
        }
      }
      request.onerror = (event) => {
        reject(event.target.webkitErrorMessage || event.target.error)
      }
    })
  }

  clearCollection (collectionName) {
    return new Promise((resolve, reject) => {
      let objectStore = this.getObjectStore(collectionName, 'readwrite')
      let request = objectStore.clear()
      request.onsuccess = (event) => {
        resolve()
      }
      request.onerror = (event) => {
        reject(event.target.webkitErrorMessage || event.target.error)
      }
    })
  }

  clear () {
    let promises = []

    for (let collectionName of this.collectionNames) {
      promises.push(this.clearCollection(collectionName))
    }

    return Promise.all(promises)
  }

  saveDoc (collectionName, docId, state, serverVersion, version, ops) {
    let doc = {
      _id: docId,
      _ops: ops,
      _v: version,
      _sv: serverVersion
    }

    for (let key in state) {
      doc[key] = state[key]
    }

    return new Promise((resolve, reject) => {
      let objectStore = this.getObjectStore(collectionName, 'readwrite')
      let updateRequest = objectStore.put(doc)
      updateRequest.onsuccess = (event) => {
        resolve()
      }
      updateRequest.onerror = (event) => {
        reject(event.target.webkitErrorMessage || event.target.error)
      }
    })
  }
}

export default IndexedDbStorage
