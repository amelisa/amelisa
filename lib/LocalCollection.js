// let debug = require('debug')('LocalCollection');
import Collection from './Collection';
import LocalDoc from './LocalDoc';

class LocalCollection extends Collection {
  constructor(name, data, model, storage) {
    super(name, data, model, storage);
    this.local = true;
  }

  add(docId, docData) {
    super.add(docId, docData);
    return Promise.resolve();
  }

  attach(docId, ops) {
    let doc = new LocalDoc(docId, ops, this, this.model, this.storage);

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
