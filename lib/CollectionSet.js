import LocalCollection from './LocalCollection';
import RemoteCollection from './RemoteCollection';

class CollectionSet {
  constructor(model, storage, data = {}) {
    this.model = model;
    this.storage = storage;
    this.data = data;
  }

  fillFromClientStorage() {
    return new Promise((resolve, reject) => {
      if (!this.storage) return resolve();

      let promises = [];
      for (let collectionName of this.storage.collectionNames) {
        let collection = this.getOrCreateCollection(collectionName);
        promises.push(collection.fillFromClientStorage());
      }
      Promise
        .all(promises)
        .then(() => {
          resolve();
        });
    });
  }

  mergeDataFromServer(data) {
    return new Promise((resolve, reject) => {
      if (!data || Object.keys(data).length === 0) return resolve();

      // TODO: implement
      resolve();
    });
  }

  rejectOp(collectionName, docId, opId) {
    let doc = this.getOrCreateDoc(collectionName, docId);
    doc.rejectOp(opId);
  }

  getCollection(collectionName) {
    let collection = this.data[collectionName];

    return collection;
  }

  getOrCreateCollection(collectionName) {
    let collection = this.data[collectionName];

    if (!collection) {
      if (this.isLocalCollection(collectionName)) {
        collection = new LocalCollection(collectionName, undefined, this.model, this.storage);
      } else {
        collection = new RemoteCollection(collectionName, undefined, this.model, this.storage);
      }
      this.data[collectionName] = collection;
    }

    return collection;
  }

  getDoc(collectionName, docId) {
    let collection = this.getCollection(collectionName);
    if (collection) {
      return collection.get(docId);
    }
  }

  getOrCreateDoc(collectionName, docId) {
    let doc = this.getDoc(collectionName, docId);
    if (!doc) {
      let collection = this.getOrCreateCollection(collectionName);
      doc = collection.attach(docId, []);
    }
    return doc;
  }

  sync() {
    for (let collectionName in this.data) {
      let collection = this.data[collectionName];
      collection.sync();
    }
  }

  isLocalCollection(collectionName) {
    let firstLetter = collectionName[0];
    return firstLetter === '_' || firstLetter === '$';
  }
}

export default CollectionSet;
