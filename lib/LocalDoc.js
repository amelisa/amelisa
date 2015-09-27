// let debug = require('debug')('LocalDoc');
import MutableDoc from './MutableDoc';

class LocalDoc extends MutableDoc {
  constructor(docId, ops, collection, model) {
    super(docId, ops, collection, model);
  }

  subscribe(listener) {
    super.subscribe(listener);

    process.nextTick(this.refresh.bind(this));
  }

  unsubscribe(listener) {
    super.unsubscribe(listener);
  }

  onOp(op, callback) {
    super.onOp(op, callback);
    if (callback) process.nextTick(callback);
  }
}

export default LocalDoc;
