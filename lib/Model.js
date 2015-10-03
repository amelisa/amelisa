let debug = require('debug')('Model');
import uuid from 'uuid';
import { EventEmitter } from 'events';
import CollectionSet from './CollectionSet';
import ClientQuerySet from './ClientQuerySet';
import Subscription from './Subscription';
import util from './util';

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
      this.set('_session.online', true);
    });

    channel.on('close', () => {
      debug('close');
      this.online = false;
      this.set('_session.online', false);
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

  fetch(...subscribes) {
    let subscription = new Subscription(subscribes, this.collectionSet, this.querySet);
    return subscription
      .fetch()
      .then(() => subscription);
  }

  subscribe(...subscribes) {
    let subscription = new Subscription(subscribes, this.collectionSet, this.querySet);
    return subscription
      .subscribe()
      .then(() => subscription);
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
          doc.onSubscribed(version);
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
        doc = collection.getDoc(docId);

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

  get() {
    let [collectionName, docId, field] = util.parseArguments(arguments);
    return this.collectionSet.get(collectionName, docId, field);
  }

  add(collectionName, docData) {
    if (!collectionName) return console.error('Model.add collectionName is required');
    if (typeof collectionName !== 'string') return console.error('Model.add collectionName should be a string');
    if (!docData) return console.error('Model.add docData is required');
    if (typeof docData !== 'object') return console.error('Model.add docData should be an object');
    // if (callback && typeof callback !== 'function') return console.error('Model.add callback should be a function');

    docData = util.clone(docData);
    let docId = docData._id;
    if (!docId) docId = this.id();
    else delete docData._id;

    let collection = this.collectionSet.getOrCreateCollection(collectionName);
    return collection.add(docId, docData);
    // return docId;
  }

  set(path, value) {
    let [collectionName, docId, field] = util.parsePath(path);

    if (!collectionName) return console.error('Model.set collectionName is required');
    if (typeof collectionName !== 'string') return console.error('Model.set collectionName should be a string');
    if (!docId) return console.error('Model.set docId is required');
    if (typeof docId !== 'string') return console.error('Model.set docId should be a string');
    // if (!field) return console.error('Model.set field is required');
    // if (typeof field !== 'string') return console.error('Model.set field should be a string');
    // if (value === undefined) return console.error('Model.set value is required');
    // if (callback && typeof callback !== 'function') return console.error('Model.set callback should be a function');

    let doc = this.collectionSet.getOrCreateDoc(collectionName, docId);

    let prev = doc.get(field);
    return doc.set(field, value);
  }

  del(path) {
    let [collectionName, docId, field] = util.parsePath(path);

    if (!collectionName) return console.error('Model.del collectionName is required');
    if (typeof collectionName !== 'string') return console.error('Model.del collectionName should be a string');
    if (!docId) return console.error('Model.del docId is required');
    if (typeof docId !== 'string') return console.error('Model.del docId should be a string');
    if (field && typeof field !== 'string') return console.error('Model.del field should be a string');
    // if (callback && typeof callback !== 'function') return console.error('Model.del callback should be a function');

    let doc = this.collectionSet.getOrCreateDoc(collectionName, docId);

    let prev = doc.get(field);
    return doc.del(field);
  }

  doc(collectionName, docId) {
    return this.collectionSet.getOrCreateDoc(collectionName, docId);
  }

  query(collectionName, expression) {
    return this.querySet.getOrCreateQuery(collectionName, expression);
  }

  send(message) {
    if (!this.online) return Promise.resolve();

    return new Promise((resolve, reject) => {
      this.callbacks[message.id] = (err) => {
        if (err) return reject(err);

        resolve();
      }
      this.channel.send(message);
    });
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

  sendOp(opData) {
    let op = this.createOp(opData);

    return this.send(op);
  }

  syncDate() {
    let start = Date.now();
    this.sendOp({type: 'date'}, (err, serverDate) => {
      if (err) return console.error('syncDate error:', err);
      // TODO: could it be better?
      let end = Date.now();
      let requestTime = end - start;
      let serverNow = serverDate - (requestTime / 2);
      let diff = serverNow - end;
      // debug('syncDate', requestTime, diff);
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

  onDomReady(done) {
    return new Promise((resolve, reject) => {
      if (document.readyState === 'complete') {
        resolve();
      } else {
        window.addEventListener('onload', resolve, false);
      }
    });
  }

  unbundleData() {
    if (util.isServer) return;

    let dataScript = document.querySelector('script[type^="application/json"]');
    let data = JSON.parse(dataScript.innerHTML);

    for (let collectionName in data) {
      let collectionData = data[collectionName];
      for (let docId in collectionData) {
        let docData = collectionData[docId];
        for (let field in docData) {
          let value = docData[field];
          this.set(collectionName, docId, field, value);
        }
      }
    }
  }
}

export default Model;
