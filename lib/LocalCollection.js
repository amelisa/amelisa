// let debug = require('debug')('LocalCollection');
import Collection from './Collection';
import LocalDoc from './LocalDoc';

class LocalCollection extends Collection {
  constructor(name, data, model, storage) {
    super(name, data, model);
    this.storage = storage;
  }

  add(docId, docData, callback) {
    let doc = super.add(docId, docData, callback);
    if (callback) process.nextTick(callback);
    return doc;
  }

  attach(docId, ops) {
    let doc = new LocalDoc(docId, ops, this, this.model, this.storage);

    // move event listeners to emit subscription change
    if (this.data[docId]) doc._events = this.data[docId]._events;

    this.data[docId] = doc;
    return doc;
  }

  fillFromClientStorage() {
    return new Promise((resolve, reject) => {
      this.storage
        .getAllDocs(this.name)
        .then((docs) => {
          for (let doc of docs) {
            this.attach(doc._id, doc._ops, doc._sv);
          }
          resolve();
        })
        .catch((err) => {
          console.error('LocalCollection.fillFromClientStorage', err);

          // Resolve anyway
          resolve();
        });
    });
  }
}

export default LocalCollection;
