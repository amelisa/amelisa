let debug = require('debug')('IndexedDbStorage');
import util from './util';
import MongoQueries from './MongoQueries';

const dbName = 'engine';
const dbVersion = 4;

class IndexedDbStorage extends MongoQueries {
  constructor(collectionNames = []) {
    super();
    this.collectionNames = collectionNames;
    let request = indexedDB.open(dbName, dbVersion);
    request.onsuccess = (e) => {
      this.db = e.target.result;
      if (this.ready) this.ready();
    }
    request.onupgradeneeded = (e) => {
      let db = e.target.result;
      for (let collectionName of collectionNames) {
        let objectStore = db.createObjectStore(collectionName, {keyPath: '_id'});
        objectStore.transaction.oncomplete = (e) => {
          // console.log('oncomplete');
        }
      }
    }
  }

  getObjectStore(collectionName, transactionType) {
    if (!this.db.objectStoreNames.contains(collectionName)) {
      debug('No colleciton ' + collectionName + ' in IndexedDB');
    }
    let transaction = this.db.transaction(collectionName, transactionType);
    return transaction.objectStore(collectionName);
  }

  getDocById(collectionName, docId) {
    return new Promise((resolve, reject) => {
      let objectStore = this.getObjectStore(collectionName, 'readonly');
      let request = objectStore.get(docId);
      request.onsuccess = (e) => {
        resolve(e.target.result);
      }
    });
  }

  getAllDocs(collectionName) {
    let expression = {};

    return this.getDocsByQuery(collectionName, expression);
  }

  getDocsByQuery(collectionName, expression) {
    return new Promise((resolve, reject) => {
      let allDocs = [];
      let objectStore = this.getObjectStore(collectionName, 'readonly');

      let request = objectStore.openCursor();
      request.onsuccess = (e) => {
        var cursor = e.target.result;
        if (cursor)
        {
          allDocs.push(cursor.value);
          cursor.continue();
        }
        else
        {
          let docs = this.getQueryResultFromArray(allDocs, expression);
          resolve(docs);
        }
      }
    });
  }

  saveDoc(collectionName, docId, serverVersion, version, state, ops) {
    let doc = {
      _id: docId,
      _ops: ops,
      _v: version,
      _sv: serverVersion
    };

    for (let key in state) {
      doc[key] = state[key];
    }

    return new Promise((resolve, reject) => {
      this
        .getDocById(collectionName, docId)
        .then((existingDoc) => {
          let objectStore = this.getObjectStore(collectionName, 'readwrite');

          if (existingDoc) {
            let updateRequest = objectStore.put(doc);
            updateRequest.onsuccess = (e) => {
              resolve();
            }
          } else {
            let addRequest = objectStore.add(doc);
            addRequest.onsuccess = (e) => {
              resolve();
            }
          }
        });
    });
  }
}

export default IndexedDbStorage;
