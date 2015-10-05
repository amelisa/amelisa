let debug = require('debug')('Collection');
import { EventEmitter } from 'events';
import Doc from './Doc';

class Collection extends EventEmitter {
  constructor(name, data = {}, model) {
    super();
    this.name = name;
    this.data = data;
    this.model = model;
  }

  get(docId, field) {
    if (!docId) {
      let state = {};
      for (let docId in this.data) {
        state[docId] = this.data[docId].get();
      }
      return state;
    }

    let doc = this.data[docId];
    if (doc) return doc.get(field);
  }

  getDoc(docId) {
    return this.data[docId];
  }

  getDocs() {
    let docs = [];
    for (let docId in this.data) {
      let doc = this.data[docId].get();
      if (doc) docs.push(doc);
    }
    return docs;
  }

  add(docId, docData) {
    let op = this.model.createOp({
      type: 'add',
      collectionName: this.name,
      docId: docId,
      value: docData
    });

    let doc = this.getDoc(docId);
    if (!doc) doc = this.attach(docId, []);
    doc.applyOp(op);
    debug('emit change on add');
    doc.emit('change');
    this.emit('change', op);
    return doc;
  }

  unattach(docId) {
    delete this.data[docId];
  }

  bundle() {
    let bundle = {};

    for (let docId in this.data) {
      let doc = this.data[docId];
      bundle[docId] = doc.bundle();
    }

    return bundle;
  }

  unbundle(bundle) {
    for (let docId in bundle) {
      let {ops} = bundle[docId];
      let serverVersion = Doc.prototype.getVersionFromOps(ops);
      let doc = this.getDoc(docId);
      if (doc) {
        doc.applyOps(ops);
        doc.serverVersion = serverVersion;
      } else {
        this.attach(docId, ops, serverVersion);
      }
    }
  }
}

export default Collection;
