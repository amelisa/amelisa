let debug = require('debug')('IndexedDbStorage')

const dbName = 'amelisa'

class IndexedDbStorage {
  constructor (collectionNames, version) {
    if (!collectionNames) collectionNames = JSON.parse(window.localStorage.getItem('collectionNames'))
    if (!collectionNames) throw new Error('IndexedDbStorage must has collectionNames')
    if (!version) version = window.localStorage.getItem('version')
    if (!version) throw new Error('IndexedDbStorage must has version')
    this.collectionNames = collectionNames
    this.version = version
  }

  async getCollectionNames () {
    return this.collectionNames
  }

  getExistingCollectionNames () {
    return Array.from(this.db.objectStoreNames)
  }

  async init () {
    return new Promise((resolve, reject) => {
      let request = window.indexedDB.open(dbName, this.version)
      request.onsuccess = (event) => {
        debug('onsuccess')
        this.db = event.target.result
        let existingCollectionNames = this.getExistingCollectionNames()
        this.existingCollectionNames = existingCollectionNames
        window.localStorage.setItem('version', this.version)
        window.localStorage.setItem('collectionNames', JSON.stringify(this.collectionNames))
        resolve(this)
      }
      request.onupgradeneeded = (event) => {
        debug('onupgradeneeded', event)
        this.db = event.target.result
        let existingCollectionNames = this.getExistingCollectionNames()
        this.existingCollectionNames = existingCollectionNames
        this.db.onerror = (event) => {
          debug('onerror upgrage', event)
        }

        for (let collectionName of this.collectionNames) {
          debug('collectionName', collectionName)
          if (existingCollectionNames.indexOf(collectionName) > -1) continue

          let objectStore = this.db.createObjectStore(collectionName, {keyPath: '_id'})
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

  async getAllDocs (collectionName) {
    return new Promise((resolve, reject) => {
      let docs = []
      let objectStore = this.getObjectStore(collectionName, 'readonly')

      let request = objectStore.openCursor()
      request.onsuccess = (event) => {
        let cursor = event.target.result
        if (cursor) {
          docs.push(cursor.value)
          cursor.continue()
        } else {
          resolve(docs)
        }
      }
      request.onerror = (event) => {
        reject(event.target.webkitErrorMessage || event.target.error)
      }
    })
  }

  async clearCollection (collectionName) {
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

  async clear () {
    let promises = []

    for (let collectionName of this.collectionNames) {
      promises.push(this.clearCollection(collectionName))
    }

    return Promise.all(promises)
  }

  async saveDoc (collectionName, docId, ops, serverVersion) {
    let doc = {
      _id: docId,
      _ops: ops,
      _sv: serverVersion
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
