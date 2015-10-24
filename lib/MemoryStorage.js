import MongoQueries from './MongoQueries';

class MemoryStorage extends MongoQueries {
  constructor(client = false) {
    super();
    this.client = client;
    this.data = {};
  }

  init() {
    return Promise.resolve();
  }

  getOrCreateCollection(collectionName) {
    let collection = this.data[collectionName];
    if (!collection) {
      collection = this.data[collectionName] = {};
    }

    return collection;
  }

  clear() {
    this.data = {};
    return Promise.resolve();
  }

  getDocById(collectionName, docId) {
    let collection = this.getOrCreateCollection(collectionName);

    return Promise.resolve(collection[docId]);
  }

  getDocsByQuery(collectionName, expression) {
    let collection = this.getOrCreateCollection(collectionName);

    let allDocs = [];
    for (let docId in collection) {
      allDocs.push(collection[docId]);
    }

    let docs = this.getQueryResultFromArray(allDocs, expression);

    return Promise.resolve(docs);
  }

  saveDoc(collectionName, docId, state, prevVersion, version, ops) {
    let doc = {
      _id: docId,
      _v: version,
      _ops: ops
    }

    if (this.client) doc._sv = prevVersion;

    for (let key in state) {
      doc[key] = state[key];
    }

    let collection = this.getOrCreateCollection(collectionName);
    collection[docId] = doc;

    return Promise.resolve();
  }
}

export default MemoryStorage;
