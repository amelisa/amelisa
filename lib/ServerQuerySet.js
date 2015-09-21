// let debug = require('debug')('ServerQuerySet');
import ProjectedQuery from './ProjectedQuery';
import ServerQuery from './ServerQuery';

class ServerQuerySet {
  constructor(store, storage) {
    this.store = store;
    this.storage = storage;
    this.data = {};
  }

  getOrCreateQuery(collectionName, expression) {
    let hash = queryHash(collectionName, expression);
    let query = this.data[hash];
    // debug('getOrCreateQuery', collectionName, expression)

    if (!query) {
      let projection = this.store.projections[collectionName];
      if (projection) {
        query = new ProjectedQuery(collectionName, projection, expression,
          this.store, this.storage, this);
      } else {
        query = new ServerQuery(collectionName, expression,
          this.store, this.storage, this);
      }

      this.data[hash] = query;
    }

    return new Promise((resolve, reject) => {
      if (query.loaded) return resolve(query);

      query.once('loaded', () => {
        resolve(query);
      });
    });
  }

  unattach(collectionName, expression) {
    let hash = queryHash(collectionName, expression);
    delete this.data[hash];
  }

  channelClose(channel) {
    for (let hash in this.data) {
      let query = this.data[hash];

      query.unsubscribe(channel);
    }
  }

  onOp(op) {
    for (let hash in this.data) {
      let query = this.data[hash];
      if (query.collectionName === op.collectionName ||
        query.projectionCollectionName === op.collectionName) {
        // if query is loading now, we need to load it one more time with new data
        if (query.loading) {
          query.once('loaded', () => {
            query.load();
          });
        } else {
          query.load();
        }
      }
    }
  }
}

function queryHash(collectionName, expression) {
  var args = [collectionName, expression];
  return JSON.stringify(args).replace(/\./g, '|');
}

export default ServerQuerySet;
