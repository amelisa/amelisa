let debug = require('debug')('Subscription');
import MutableDoc from './MutableDoc';
import ClientQuery from './ClientQuery';
import util from './util';

import { EventEmitter } from 'events';

class Subscription extends EventEmitter {
  constructor(rawSubscribes, collectionSet, querySet, fetchOnly = false) {
    super();
    this.collectionSet = collectionSet;
    this.querySet = querySet;
    this.fetchOnly = fetchOnly;

    this.subscribes = this.parseSubscribes(rawSubscribes);

    this.onChange = this.onChange.bind(this);
  }

  parseSubscribes(rawSubscribes) {
    let subscribes = [];

    let first = rawSubscribes[0];
    if (!first) return [];
    if (Array.isArray(first[0])) rawSubscribes = first;
    if (typeof first === 'string' && first.indexOf('.') === -1) rawSubscribes = [rawSubscribes];

    for (let subscribe of rawSubscribes) {
      if (subscribe instanceof MutableDoc || subscribe instanceof ClientQuery) {
        subscribes.push(subscribe);
        continue;
      }

      let [collectionName, docIdOrExpression] = util.parsePath(subscribe);

      if (typeof docIdOrExpression === 'string') {
        let doc = this.collectionSet.getOrCreateDoc(collectionName, docIdOrExpression);
        subscribes.push(doc);
      } else {
        let query = this.querySet.getOrCreateQuery(collectionName, docIdOrExpression);
        subscribes.push(query);
      }
    }

    return subscribes;
  }

  fetch() {
    let promises = [];

    for (let subscribe of this.subscribes) {
      promises.push(subscribe.fetch());
    }

    return Promise.all(promises);
  }

  subscribe() {
    let promises = [];

    for (let subscribe of this.subscribes) {
      subscribe.on('change', this.onChange);
      promises.push(subscribe.subscribe());
    }

    return Promise.all(promises);
  }

  unsubscribe() {
    let promises = [];

    for (let subscribe of this.subscribes) {
      subscribe.removeListener('change', this.onChange);
      promises.push(subscribe.unsubscribe());
    }

    return Promise.all(promises);
  }

  onChange() {
    this.emit('change');
  }

  changeSubscribes(nextSubscribes) {
    this
      .unsubscribe()
      .then(() => {
        this.subscribes = this.parseSubscribes(nextSubscribes);
        return this.subscribe();
      });
  }

  get() {
    let data = [];

    for (let subscribe of this.subscribes) {
      data.push(subscribe.get());
    }

    return data;
  }
}

export default Subscription;
