import Collection from './Collection';

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
      collection = this.data[collectionName] = new Collection(collectionName, {}, this.model, this.storage);
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
}

export default CollectionSet;
