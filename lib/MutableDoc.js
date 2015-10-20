// let debug = require('debug')('MutableDoc');
import Doc from './Doc';

class MutableDoc extends Doc {
  constructor(docId, ops, collection, model) {
    super(docId, ops);
    this.collection = collection;
    this.model = model;
  }

  set(field, value) {
    let op = this.model.createOp({
      type: 'set',
      collectionName: this.collection.name,
      docId: this.docId,
      field: field,
      value: value
    });

    return this.onOp(op);
  }

  del(field) {
    let op = this.model.createOp({
      type: 'del',
      collectionName: this.collection.name,
      docId: this.docId,
      field: field
    });

    return this.onOp(op);
  }

  refresh() {
    this.refreshState();
    this.emit('change');
  }

  onOp(op) {
    // debug('onOp', op);
    this.applyOp(op);
    this.emit('change');
    this.collection.emit('change', op);
    return Promise.resolve();
  }
}

export default MutableDoc;
