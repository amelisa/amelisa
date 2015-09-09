let debug = require('debug')('Subscription');

import { EventEmitter } from 'events';

class Subscription extends EventEmitter {
  constructor(queries, collectionSet, querySet) {
    super();
    this.collectionSet = collectionSet;
    this.querySet = querySet;
    this.listeners = {};
    this.results = {};

    this.parsedQueries = this.parseQueries(queries);

    this.subscribe();
  }

  parseQueries(queries) {
    let parsedQueries = {};

    for (let name in queries) {
      let query = queries[name];

      let collectionName = query[0];
      let isQuery = typeof query[1] === 'object';

      if (isQuery) {
        let expression = query[1];
        let q = this.querySet.getOrCreateQuery(collectionName, expression);

        parsedQueries[name] = {
          isQuery: isQuery,
          collectionName: collectionName,
          expression: expression,
          query: q
        };

      } else {
        let docId = query[1];
        let doc = this.collectionSet.getOrCreateDoc(collectionName, docId);

        parsedQueries[name] = {
          isQuery: isQuery,
          collectionName: collectionName,
          docId: docId,
          doc: doc
        };
      }
    }

    return parsedQueries;
  }

  subscribe() {
    for (let name in this.parsedQueries) {
      let query = this.parsedQueries[name];

      if (query.isQuery) {
        this.subscribeToEmitter(name, query.query);
      } else {
        this.subscribeToEmitter(name, query.doc);
      }
    }
  }

  unsubscribe() {
    for (let name in this.parsedQueries) {
      let query = this.parsedQueries[name];

      if (query.isQuery) {
        this.unsubscribeToEmitter(name, query.query);
      } else {
        this.unsubscribeToEmitter(name, query.doc);
      }
    }
    this.listeners = {};
    this.results = {};
  }

  changeQueries(nextQueries) {
    this.unsubscribe();
    this.parsedQueries = this.parseQueries(nextQueries);
    this.subscribe();
  }

  subscribeToEmitter(name, emitter) {
    let listener = this.listeners[name];

    if (!listener) {
      listener = this.listeners[name] = () => {
        //debug('listener', name);
        this.results[name] = true;
        this.onChangeAndLog()
      }
    }
    emitter.subscribe(listener);
  }

  unsubscribeToEmitter(name, emitter) {
    let listener = this.listeners[name];

    if (listener) {
      emitter.unsubscribe(listener);
    }
  }

  onChangeAndLog() {
    //debug('emitter change');
    this.onChange();
  }

  onChange() {
    //debug('onChange', Object.keys(this.parsedQueries).length, Object.keys(this.results).length);

    if (Object.keys(this.parsedQueries).length === Object.keys(this.results).length) {
      debug('change');
      this.emit('change');
    }
  }

  get() {
    let data = {};

    for (let name in this.parsedQueries) {
      let query = this.parsedQueries[name];

      if (query.isQuery) {
        data[name] = query.query.get();
      } else {
        data[name] = query.doc.get();
      }
    }

    return data;
  }
}

export default Subscription;
