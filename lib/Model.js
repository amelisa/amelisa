let debug = require('debug')('Model');
import uuid from 'uuid';
import { EventEmitter } from 'events';
import CollectionSet from './CollectionSet';
import ClientQuerySet from './ClientQuerySet';
import Subscription from './Subscription';
import { isServer } from './util';

class Model extends EventEmitter {
  constructor(channel, source, storage) {
    super();
    this.channel = channel;
    this.online = false;
    this.source = source;
    this.collectionSet = new CollectionSet(this, storage);
    this.querySet = new ClientQuerySet(this, storage);
    this.callbacks = {};
    this.dateDiff = 0;

    channel.on('message', (message) => {
      // debug('message', message);
      this.onMessage(message);
    });

    channel.on('open', () => {
      debug('open');
      this.online = true;
      this.syncDate();
      this.collectionSet.sync();
      //this.querySet.sync();
    });

    channel.on('close', () => {
      debug('close');
      this.online = false;
    });
  }

  init(data) {
    debug('init');
    return new Promise((resolve, reject) => {
      this.collectionSet
        .fillFromClientStorage()
        .then(() => {
          this.collectionSet
            .mergeDataFromServer(data)
            .then(resolve);
        });
    });
  }

  subscribeDoc(collectionName, docId) {
    let doc = this.collectionSet.getDoc(collectionName, docId);

    if (!doc) {
      let collection = this.collectionSet.getOrCreateCollection(collectionName);
      doc = collection.attach(docId);
    }

    doc.subscribe(() => {});
  }

  subscribe(queries) {
    let subscription = new Subscription(queries, this.collectionSet, this.querySet);
    return subscription;
  }

  onMessage(message) {
    let { type, id, collectionName, docId, expression, value, version, error } = message;
    let doc;
    let collection;
    let callback = this.callbacks[id];
    if (callback) delete this.callbacks[id];

    debug(type, id, collectionName, docId, expression, !!callback)

    switch (type) {
      case 'ackdate':
        if (callback && !error) callback(null, value);
        break;

      case 'ack':
        if (error) this.collectionSet.rejectOp(collectionName, docId, id);

        if (callback) {
          if (error) callback(new Error(error));
          else callback();
        }
        break;

      case 'sub':
        doc = this.collectionSet.getDoc(collectionName, docId);
        if (doc) {
          doc.subscribed(version);
        }
        break;

      case 'q':
        let query = this.querySet.getOrCreateQuery(collectionName, expression);
        query.update(value);
        break;

      case 'sync':
        doc = this.collectionSet.getDoc(collectionName, docId);
        if (doc) {
          doc.synced(version);
        }
        break;

      case 'add':
      case 'set':
      case 'del':
        collection = this.collectionSet.getOrCreateCollection(collectionName);
        doc = collection.get(docId);

        if (doc) {
          doc.receiveOp(message);
        } else {
          collection.attach(docId, [message]);
        }
        break;

      default:
    }
  }

  getQuery(collectionName, expression) {
    return this.query(collectionName, expression).get();
  }

  get(collectionName, docId, field) {
    let doc = this.collectionSet.getDoc(collectionName, docId);
    if (!doc) return;

    return doc.get(field);
  }

  add(collectionName, docData, callback) {
    if (!collectionName) return console.error('Model.add collectionName is required');
    if (typeof collectionName !== 'string') return console.error('Model.add collectionName should be a string');
    if (!docData) return console.error('Model.add docData is required');
    if (typeof docData !== 'object') return console.error('Model.add docData should be an object');
    if (callback && typeof callback !== 'function') return console.error('Model.add callback should be a function');

    let docId = docData._id;
    if (!docId) docId = this.id();
    else delete docData._id;

    let collection = this.collectionSet.getOrCreateCollection(collectionName);
    let doc = collection.add(docId, docData, callback);
    return docId;
  }

  set(collectionName, docId, field, value, callback) {
    if (!collectionName) return console.error('Model.set collectionName is required');
    if (typeof collectionName !== 'string') return console.error('Model.set collectionName should be a string');
    if (!docId) return console.error('Model.set docId is required');
    if (typeof docId !== 'string') return console.error('Model.set docId should be a string');
    if (!field) return console.error('Model.set field is required');
    if (typeof field !== 'string') return console.error('Model.set field should be a string');
    if (!value) return console.error('Model.set value is required');
    if (callback && typeof callback !== 'function') return console.error('Model.set callback should be a function');

    let doc = this.collectionSet.getDoc(collectionName, docId);
    if (!doc) {
      if (callback) callback(new Error('Fetch doc before mutate: ' +
        collectionName + ' ' + docId));
      else console.error('Fetch doc before mutate: ' +
        collectionName + ' ' + docId);
      return;
    }

    let prev = doc.get(field);
    doc.set(field, value, callback);
    return prev;
  }

  del(collectionName, docId, field, callback) {
    if (typeof field === 'function') {
      callback = field;
      field = undefined;
    }
    if (!collectionName) return console.error('Model.del collectionName is required');
    if (typeof collectionName !== 'string') return console.error('Model.del collectionName should be a string');
    if (!docId) return console.error('Model.del docId is required');
    if (typeof docId !== 'string') return console.error('Model.del docId should be a string');
    if (field && typeof field !== 'string') return console.error('Model.del field should be a string');
    if (callback && typeof callback !== 'function') return console.error('Model.del callback should be a function');

    let doc = this.collectionSet.getDoc(collectionName, docId);
    if (!doc) {
      if (callback) callback(new Error('Fetch doc before mutate: ' +
        collectionName + ' ' + docId));
      else console.error('Fetch doc before mutate: ' +
        collectionName + ' ' + docId);
      return;
    }

    let prev = doc.get(field);
    doc.del(field, callback);
    return prev;
  }

  query(collectionName, expression) {
    return this.querySet.getOrCreateQuery(collectionName, expression);
  }

  send(message, callback) {
    if (this.online) {
      if (callback) this.callbacks[message.id] = callback;
      this.channel.send(message);
    }
  }

  fetch(collectionName, docIdOrExpression, callback) {
    if (typeof docIdOrExpression === 'string') {
      let doc = this.collectionSet.getOrCreateDoc(collectionName, docIdOrExpression);
      doc.fetch(callback);
    } else {
      let query = this.querySet.getOrCreateQuery(collectionName, docIdOrExpression);
      query.fetch(callback);
    }
  }

  createOp(opData) {
    let op = {
      id: this.id(),
      source: this.source,
      date: this.date()
    }

    for (let key in opData) {
      if (opData[key]) op[key] = opData[key];
    }

    return op;
  }

  sendOp(opData, callback) {
    let op = this.createOp(opData);

    this.send(op, callback);
  }

  syncDate() {
    let start = Date.now();
    this.sendOp({type: 'date'}, (err, serverDate) => {
      // TODO: could it be better?
      let end = Date.now();
      let requestTime = end - start;
      let serverNow = serverDate - (requestTime / 2);
      let diff = serverNow - end;
      //debug('syncDate', requestTime, diff);
      // TODO: save diff in localStorage
      this.dateDiff = diff;
    });
  }

  date() {
    return Date.now() + this.dateDiff;
  }

  id() {
    return uuid.v4();
  }

  close() {
    // TODO: cleanup
  }

  getSystemData() {
    return {
      online: this.online
    }
  }

  getData() {
    if (isServer) return this.data;

    let dataScript = document.querySelector('script[type^="application/json"]');
    return JSON.parse(dataScript.innerHTML);
  }

  setData(data) {
    this.data = data;
  }
}

export default Model;
