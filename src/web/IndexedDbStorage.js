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
        this.db = event.target.result
        let existingCollectionNames = this.getExistingCollectionNames()
        this.existingCollectionNames = existingCollectionNames
        window.localStorage.setItem('version', this.version)
        window.localStorage.setItem('collectionNames', JSON.stringify(this.collectionNames))
        resolve(this)
      }
      request.onupgradeneeded = (event) => {
        this.db = event.target.result
        let existingCollectionNames = this.getExistingCollectionNames()
        this.existingCollectionNames = existingCollectionNames
        this.db.onerror = (event) => {
          console.trace('onerror upgrage', event)
        }

        for (let collectionName of this.collectionNames) {
          if (existingCollectionNames.indexOf(collectionName) > -1) continue

          let objectStore = this.db.createObjectStore(collectionName, {keyPath: 'id'})
          objectStore.transaction.oncomplete = (e) => {
            // TODO: handle it
          }
          objectStore.transaction.onerror = (e) => {
            console.trace('onerror', e)
          }
        }
      }
      request.onerror = (event) => {
        reject(event.target.webkitErrorMessage || event.target.error)
      }
    })
  }

  getObjectStore (collectionName, transactionType) {
    if (Array.from(this.db.objectStoreNames).indexOf(collectionName) === -1) {
      console.trace('No colleciton ' + collectionName + ' in IndexedDB')
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

  close () {
    this.db.close()
  }

  async saveDoc (collectionName, docId, ops, serverVersion) {
    let doc = {
      id: docId,
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
