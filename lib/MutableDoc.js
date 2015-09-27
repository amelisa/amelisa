let debug = require('debug')('MutableDoc');
import Doc from './Doc';
import util from './util';

class MutableDoc extends Doc {
  constructor(docId, ops, collection, model) {
    super(docId, ops);
    this.collection = collection;
    this.model = model;
  }

  set(field, value, callback) {
    let op = this.model.createOp({
      type: 'set',
      collectionName: this.collection.name,
      docId: this.docId,
      field: field,
      value: value
    });

    this.onOp(op, callback);
  }

  del(field, callback) {
    let op = this.model.createOp({
      type: 'del',
      collectionName: this.collection.name,
      docId: this.docId,
      field: field
    });

    this.onOp(op, callback);
  }

  refresh() {
    this.refreshState();
    this.emit('change');
  }

  subscribe(listener) {
    this.addListener('change', listener);

    // We allready subscribed to this doc, no need to send message
    if (this.listeners('change').length > 1) {
      if (this.serverVersion) this.emit('change');
      return;
    }
  }

  unsubscribe(listener) {
    this.removeListener('change', listener);

    if (this.listeners('change').length > 0) return;
  }

  onOp(op, callback) {
    debug('onOp', op);
    this.applyOp(op);
    this.emit('change');
    this.collection.emit('change', op);
  }
}

export default MutableDoc;
