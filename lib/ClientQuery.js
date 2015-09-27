let debug = require('debug')('ClientQuery');
import Query from './Query';
import RemoteDoc from './RemoteDoc';
import util from './util';

class ClientQuery extends Query {
  constructor(collectionName, expression, model, collection, querySet) {
    super(collectionName, expression);
    this.model = model;
    this.collection = collection;
    this.querySet = querySet;

    this.listener = (op) => {
      this.refresh(op);
    }
    collection.on('change', this.listener);
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
    this.emit('change');

    this.attachDocsToCollection(docs);
  }

  attachDocsToCollection(docs) {
    // TODO: do not attach aggregate results and others
    if (!this.isDocs) return;

    for (let docData of docs) {
      let serverVersion = RemoteDoc.prototype.getVersionFromOps(docData._ops);
      let doc = this.collection.getDoc(docData._id);
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
    let docs = this.collection.getDocs();
    if (this.local) {
      let docDatas = this.getQueryResultFromArray(docs, this.expression);
      this.data = this.getStatesFromDocs(docDatas);
    }
  }

  subscribe(listener) {
    this.addListener('change', listener);
  }

  unsubscribe(listener) {
    this.removeListener('change', listener);

    if (this.listeners('change').length > 0) return;

    this.querySet.unattach(this.collectionName, this.expression);
  }
}

export default ClientQuery;
