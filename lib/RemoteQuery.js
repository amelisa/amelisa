let debug = require('debug')('RemoteQuery');
import ClientQuery from './ClientQuery';
import RemoteDoc from './RemoteDoc';
import util from './util';

class RemoteQuery extends ClientQuery {
  constructor(collectionName, expression, model, storage, collection, querySet) {
    super(collectionName, expression, model, storage, collection, querySet);
    this.server = false;
  }

  fetch(callback) {
    this.model.sendOp({
      type: 'qfetch',
      collectionName: this.collection.name,
      expression: this.expression
    }, callback);
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
          let doc = this.collection.get(docData._id);
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

  subscribe(listener) {
    super.subscribe(listener);

    // We allready subscribed to this doc, no need to send message
    if (this.listeners('change').length > 1) {
      if (this.server || !this.model.online) this.emit('change');
      return;
    }

    if (this.model.online) {
      this.model.sendOp({
        type: 'qsub',
        collectionName: this.collectionName,
        expression: this.expression
      });
    } else {
      process.nextTick(this.refresh.bind(this));
    }
  }

  unsubscribe(listener) {
    super.unsubscribe(listener);

    if (!this.model.online) return;

    this.model.sendOp({
      type: 'qunsub',
      collectionName: this.collectionName,
      expression: this.expression
    });
  }

  sync() {
    this.model.sendOp({
      type: 'qsync',
      collectionName: this.collectionName,
      expression: this.expression
    });
  }
}

export default RemoteQuery;
