let debug = require('debug')('ServerQuery');
import arraydiff from 'arraydiff';
import Query from './Query';
import util from './util';

class ServerQuery extends Query {
  constructor(collectionName, expression, store, storage, querySet) {
    super(collectionName, expression);
    this.store = store;
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

    // debug('load', this.collectionName, this.expression);

    this.storage
      .getDocsByQuery(this.collectionName, this.expression)
      .then((docs) => {
        // debug('loaded', this.collectionName, this.expression, docs);
        this.prev = this.data;
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
    debug('broadcast', this.projectionCollectionName, this.collectionName, this.expression, this.channels.length);

    if (!this.isDocs) {
      if (util.fastEqual(this.prev, this.data)) return;

      for (let channel of this.channels) {
        this.sendFullQueryToChannel(channel);
      }
      return;
    }

    let diffs = this.getDiffs(this.prev, this.data);

    for (let channel of this.channels) {
      this.sendDiffQueryToChannel(channel, diffs);
    }
  }

  sendFullQueryToChannel(channel) {
    let op = {
      type: 'q',
      collectionName: this.collectionName,
      expression: this.expression,
      value: this.get()
    }

    this.sendOp(op, channel);
  }

  sendDiffQueryToChannel(channel, diffs) {
    let op = {
      type: 'qdiff',
      collectionName: this.collectionName,
      expression: this.expression,
      value: diffs
    }

    this.sendOp(op, channel);
  }

  getDiffs(prev, data) {
    let prevIds = prev.map((doc) => doc._id);
    let docIds = data.map((doc) => doc._id);

    let docMap = {};
    for (let doc of this.data) {
      docMap[doc._id] = doc;
    }

    let diffs = arraydiff(prevIds, docIds);

    for (let diff of diffs) {
      if (diff.type === 'insert') {
        let docValues = [];
        for (let docId of diff.values) {
          let doc = docMap[docId];
          docValues.push(doc);
        }
        diff.values = docValues;
      }
    }

    return diffs;
  }

  fetch(channel, opId) {
    this.sendFullQueryToChannel(channel);

    let op = {
      id: opId,
      type: 'ack'
    }
    this.sendOp(op, channel);

    this.maybeUnattach();
  }

  subscribe(channel, opId) {
    this.channels.push(channel);

    this.sendFullQueryToChannel(channel);

    let op = {
      id: opId,
      type: 'ack'
    }

    this.sendOp(op, channel);
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
      this.sendFullQueryToChannel(channel);
    }
  }

  sendOp(op, channel) {
    // debug('sendOp')
    this.store.sendOp(op, channel);
  }
}

export default ServerQuery;
