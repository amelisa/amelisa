let debug = require('debug')('ServerDocSet');
import ProjectedDoc from './ProjectedDoc';
import ServerDoc from './ServerDoc';

class ServerDocSet {
  constructor(store, storage) {
    this.store = store;
    this.storage = storage;
    this.data = {};
  }

  getDocPath(collectionName, docId) {
    return collectionName + '_' + docId;
  }

  getOrCreateDoc(collectionName, docId) {
    let docPath = this.getDocPath(collectionName, docId);
    let doc = this.data[docPath];
    //debug('getOrCreateDoc', collectionName, docId, !!doc);

    if (!doc) {
      let projection = this.store.projections[collectionName];
      if (projection) {
        doc = new ProjectedDoc(collectionName, projection,
          docId, [], this.store, this.storage, this);
      } else {
        doc = new ServerDoc(collectionName,
          docId, [], this.store, this.storage, this);
      }
      this.data[docPath] = doc;
    }

    return new Promise((resolve, reject) => {
      if (doc.loaded) return resolve(doc);

      doc.once('loaded', () => {
        resolve(doc);
      });
    });
  }

  unattach(collectionName, docId) {
    //debug('unattach', collectionName, docId);
    let docPath = this.getDocPath(collectionName, docId);
    delete this.data[docPath];
  }

  channelClose(channel) {
    for (let docPath in this.data) {
      let doc = this.data[docPath];

      doc.unsubscribe(channel);
    }
  }
}

export default ServerDocSet;
