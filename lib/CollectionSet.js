import LocalCollection from './LocalCollection';
import RemoteCollection from './RemoteCollection';
import util from './util';

class CollectionSet {
  constructor(model, storage, data = {}) {
    this.model = model;
    this.storage = storage;
    this.data = data;
  }

  get(collectionName, docId, field) {
    if (!collectionName) {
      let state = {};
      for (let collectionName in this.data) {
        state[collectionName] = this.data[collectionName].get();
      }
      return state;
    }

    let collection = this.data[collectionName];
    if (collection) return collection.get(docId, field);
  }

  getCollection(collectionName) {
    let collection = this.data[collectionName];

    return collection;
  }

  getOrCreateCollection(collectionName) {
    let collection = this.data[collectionName];

    if (!collection) {
      if (util.isLocalCollection(collectionName)) {
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
      return collection.getDoc(docId);
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

  clearCollection(collectionName) {
    delete this.data[collectionName];
  }

  fillFromClientStorage() {
    if (!this.storage) return resolve();

    let promises = [];
    for (let collectionName of this.storage.collectionNames) {
      let collection = this.getOrCreateCollection(collectionName);
      promises.push(collection.fillFromClientStorage());
    }

    return Promise.all(promises);
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

  sync() {
    for (let collectionName in this.data) {
      let collection = this.data[collectionName];
      if (!collection.local) collection.sync();
    }
  }

  bundle() {
    let bundle = {};

    for (let collectionName in this.data) {
      let collection = this.data[collectionName];
      bundle[collectionName] = collection.bundle();
    }

    return bundle;
  }

  unbundle(bundle) {
    for (let collectionName in bundle) {
      let collection = this.getOrCreateCollection(collectionName);
      let collectionBundle = bundle[collectionName];
      collection.unbundle(collectionBundle);
    }
  }
}

export default CollectionSet;
