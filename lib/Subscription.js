let debug = require('debug')('Subscription');
import MutableDoc from './MutableDoc';
import ClientQuery from './ClientQuery';
import util from './util';

import { EventEmitter } from 'events';

class Subscription extends EventEmitter {
  constructor(rawSubscribes, collectionSet, querySet) {
    super();
    this.collectionSet = collectionSet;
    this.querySet = querySet;
    this.listeners = {};
    this.results = {};

    this.subscribes = this.parseSubscribes(rawSubscribes);

    this.onChange = this.onChange.bind(this);
  }

  parseSubscribes(rawSubscribes) {
    let subscribes = [];

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
      promises.push(subscribe.unsubscribe());
    }

    this.listeners = {};
    this.results = {};

    return Promise.all(promises);

  }

  onChange() {
    // debug('onChange', Object.keys(this.subscribes).length, Object.keys(this.results).length);

    this.emit('change');
  }

  changeSubscribes(nextSubscribes) {
    this.unsubscribe();
    this.subscribes = this.parseQueries(nextSubscribes);
    this.subscribe();
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
