let debug = require('debug')('RemoteQuery');
import ClientQuery from './ClientQuery';

class RemoteQuery extends ClientQuery {
  constructor(collectionName, expression, model, collection, querySet, storage) {
    super(collectionName, expression, model, collection, querySet);
    this.storage = storage;
    this.server = false;
  }

  fetch() {
    return this.model.sendOp({
      type: 'qfetch',
      collectionName: this.collection.name,
      expression: this.expression
    });
  }

  update(docs) {
    super.update(docs);
    this.server = true;
  }

  refresh(op) {
    debug('refresh', op ? op.type : null, this.server);
    if (this.server) {
      if (op && (op.type === 'add' || (op.type === 'del' && !op.field))) return;

      let docs = [];
      debug('docs', this.data);
      if (this.isDocs) {
        for (let docData of this.data) {
          let doc = this.collection.getDoc(docData._id);
          docs.push(doc.get());
        }
      }
      this.data = docs;
    } else {
      super.refresh(op);
    }
    // TODO: emit only if there were changes
    this.emit('change');
  }

  subscribe() {
    if (this.subscribed) return Promise.resolve();
    this.subscribed = true;

    return this.model.sendOp({
      type: 'qsub',
      collectionName: this.collectionName,
      expression: this.expression
    });
  }

  unsubscribe(listener) {
    super.unsubscribe(listener);

    if (!this.model.online) return;

    return this.model.sendOp({
      type: 'qunsub',
      collectionName: this.collectionName,
      expression: this.expression
    });
  }

  sync() {
    return this.model.sendOp({
      type: 'qsync',
      collectionName: this.collectionName,
      expression: this.expression
    });
  }
}

export default RemoteQuery;
