let debug = require('debug')('ServerQuery');
import Query from './Query';
import util from './util';

class ServerQuery extends Query {
  constructor(collectionName, expression, storage, querySet) {
    super(collectionName, expression);
    this.storage = storage;
    this.querySet = querySet;
    this.loaded = false;
    this.loading = false;
    this.channels = [];

    this.load();
    this.on('loaded', () => {
      this.broadcast();
    });
  }

  load() {
    // TODO: can be race condition. should load one more time
    if (this.loading) return;
    this.loading = true;

    //debug('load', this.collectionName, this.expression);

    this.storage
      .getDocsByQuery(this.collectionName, this.expression)
      .then((docs) => {
        debug('loaded', this.collectionName, this.expression);
        this.data = docs;
        this.loading = false;
        this.loaded = true;
        this.emit('loaded');
      })
      .catch((err) => {
        console.error('ServerQuery.load', err);
      });
  }

  broadcast() {
    debug('broadcast', this.channels.length);
    for (let channel of this.channels) {
      this.sendQueryToChannel(channel);
    }
  }

  sendQueryToChannel(channel) {
    // TODO: send diff instead of full query data
    channel.send({
      type: 'q',
      collectionName: this.collectionName,
      expression: this.expression,
      value: this.data
    });
  }

  fetch(channel, opId) {
    this.sendQueryToChannel(channel);

    channel.send({
      id: opId,
      type: 'ack'
    });

    this.maybeUnattach();
  }

  subscribe(channel) {
    this.channels.push(channel);

    if (this.loaded) {
      this.sendQueryToChannel(channel);
    }
  }

  unsubscribe(channel) {
    util.arrayRemove(this.channels, channel);

    this.maybeUnattach()
  }

  maybeUnattach() {
    // TODO: add timeout
    if (this.channels.length === 0) {
      this.querySet.unattach(this.collectionName, this.expression);
    }
  }

  sync(channel) {
    this.channels.push(channel);

    if (this.loaded) {
      this.sendQueryToChannel(channel);
    }
  }
}

export default ServerQuery;
