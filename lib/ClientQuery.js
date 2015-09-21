let debug = require('debug')('ClientQuery');
import Query from './Query';
import ClientDoc from './ClientDoc';
import util from './util';

class ClientQuery extends Query {
  constructor(collectionName, expression, model, storage, collection, querySet) {
    super(collectionName, expression);
    this.model = model;
    this.data = [];
    this.storage = storage;
    this.collection = collection;
    this.querySet = querySet;
    this.server = false;

    this.listener = (op) => {
      this.refresh(op);
    }
    collection.on('change', this.listener);
  }

  get() {
    return this.data;
  }

  getStateFromDocData(doc) {
    let state = {};
    for (let field in doc) {
      if (!util.dbFields[field]) state[field] = doc[field];
    }
    return state;
  }

  getStatesFromDocs(docs) {
    if (!this.isDocs) return docs;
    return docs.map((doc) => this.getStateFromDocData(doc));
  }

  update(docs) {
    debug('update')
    this.data = this.getStatesFromDocs(docs);
    this.server = true;
    this.emit('change');

    this.attachDocsToCollection(docs);
  }

  attachDocsToCollection(docs) {
    // TODO: do not attach aggregate results and others
    if (!this.isDocs) return;

    for (let docData of docs) {
      let serverVersion = ClientDoc.prototype.getVersionFromOps(docData._ops);
      let doc = this.collection.get(docData._id);
      if (doc) {
        doc.applyOps(docData._ops);
        doc.distillOps();
        doc.serverVersion = serverVersion;
      } else {
        doc = this.collection.attach(docData._id, docData._ops, serverVersion);
      }
      doc.save();
    }
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
      let docs = this.collection.getDocs();
      if (!util.isServer) {
        let docDatas = this.storage.getQueryResultFromArray(docs, this.expression);
        this.data = this.getStatesFromDocs(docDatas);
      }
    }
    // TODO: emit only if there were changes
    this.emit('change');
  }

  fetch(callback) {
    this.model.sendOp({
      type: 'qfetch',
      collectionName: this.collection.name,
      expression: this.expression
    }, callback);
  }

  subscribe(listener) {
    this.addListener('change', listener);

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
      // this.refresh();
    }
  }

  unsubscribe(listener) {
    this.removeListener('change', listener);

    if (this.listeners('change').length > 0) return;

    this.querySet.unattach(this.collectionName, this.expression);

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

export default ClientQuery;
