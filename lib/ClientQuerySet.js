// let debug = require('debug')('ClientQuerySet');
import LocalQuery from './LocalQuery';
import RemoteQuery from './RemoteQuery';
import util from './util';

class ClientQuerySet {
  constructor(model, storage) {
    this.model = model;
    this.data = {};
    this.storage = storage;
  }

  getOrCreateQuery(collectionName, expression) {
    let hash = queryHash(collectionName, expression);
    let query = this.data[hash];

    if (!query) {
      let collection = this.model.collectionSet.getOrCreateCollection(collectionName);
      if (util.isLocalCollection(collectionName)) {
        query = new LocalQuery(collectionName, expression, this.model, collection, this);
      } else {
        query = new RemoteQuery(collectionName, expression, this.model, collection, this, this.storage);
      }
      this.data[hash] = query;
    }

    return query;
  }

  unattach(collectionName, expression) {
    let hash = queryHash(collectionName, expression);
    let query = this.data[hash];
    query.collection.removeListener('change', query.listener);
    delete this.data[hash];
  }

  sync() {
    for (let hash in this.data) {
      let query = this.data[hash];
      query.sync();
    }
  }
}

function queryHash(collectionName, expression) {
  let args = [collectionName, expression];
  return JSON.stringify(args).replace(/\./g, '|');
}

export default ClientQuerySet;
