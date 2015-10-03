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

  attach(docId, ops) {
    let doc = new Doc(docId, ops);

    // move event listeners to emit subscription change
    if (this.data[docId]) doc._events = this.data[docId]._events;

    this.data[docId] = doc;
    return doc;
  }

  unattach(docId) {
    delete this.data[docId];
  }
}

export default Collection;
