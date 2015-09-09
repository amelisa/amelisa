let debug = require('debug')('ServerQuerySet');
import ServerQuery from './ServerQuery';

class ServerQuerySet {
  constructor(storage) {
    this.storage = storage;
    this.data = {};
  }

  getOrCreateQuery(collectionName, expression) {
    let hash = queryHash(collectionName, expression);
    let query = this.data[hash];

    if (!query) {
      query = this.data[hash] = new ServerQuery(collectionName, expression, this.storage, this);
    }

    return new Promise((resolve, reject) => {
      if (query.loaded) return resolve(query);

      query.on('loaded', () => {
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
    //debug('onOp', op.type);
    for (let hash in this.data) {
      let query = this.data[hash];
      if (query.collectionName === op.collectionName) {

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
