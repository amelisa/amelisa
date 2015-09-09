let debug = require('debug')('Store');
import ChannelSession from './ChannelSession';
import ServerDocSet from './ServerDocSet';
import ServerQuerySet from './ServerQuerySet';
import ServerChannel from './ServerChannel';
import Model from './Model';
import util from './util';

class Store {
  constructor(storage) {
    this.storage = storage;
    this.name = 'server1';
    this.docSet = new ServerDocSet(storage);
    this.querySet = new ServerQuerySet(storage);
    this.clients = [];
  }

  createModel() {
    let channel = new ServerChannel();
    let channel2 = new ServerChannel();
    channel.pipe(channel2).pipe(channel);
    let model = new Model(channel, this.name);

    this.client(channel2);
    model.online = true;

    return model;
  }

  client(channel) {
    debug('client');
    channel._session = new ChannelSession();
    this.clients.push(channel);

    channel.on('message', (message) => {
      //debug('message', message);
      this.validateMessage(message, channel);
    });

    channel.on('close', () => {
      debug('close');
      util.arrayRemove(this.clients, channel);
      this.docSet.channelClose(channel);
      this.querySet.channelClose(channel);
    });

    channel.on('error', (err) => {
      debug('error', err);
    });
  }

  validateMessage(message, channel) {
    if (this.hook) {
      this.hook(message, channel, (err) => {
        if (err) {
          let op = {
            id: message.id,
            type: 'ack',
            collectionName: message.collectionName,
            docId: message.docId,
            error: err
          }
          channel.send(op);
        } else {
          this.onMessage(message, channel);
        }
      });
    } else {
      this.onMessage(message, channel);
    }
  }

  onMessage(message, channel) {
    let { type, id, collectionName, docId, expression, version } = message;
    let doc;
    let query;

    debug(type, id, collectionName, docId, expression);

    switch (type) {
      case 'fetch':
        this.docSet
          .getOrCreateDoc(collectionName, docId)
          .then((doc) => {
            doc.fetch(channel, id);
          });
        break;

      case 'qfetch':
        this.querySet
          .getOrCreateQuery(collectionName, expression)
          .then((query) => {
            query.fetch(channel, id);
          });
        break;

      case 'sub':
        this.docSet
          .getOrCreateDoc(collectionName, docId)
          .then((doc) => {
            doc.subscribe(channel, version);
          });
        break;

      case 'unsub':
        this.docSet
          .getOrCreateDoc(collectionName, docId)
          .then((doc) => {
            doc.unsubscribe(channel);
          });
        break;

      case 'qsub':
        this.querySet
          .getOrCreateQuery(collectionName, expression)
          .then((query) => {
            query.subscribe(channel);
          });
        break;

      case 'qunsub':
        this.querySet
          .getOrCreateQuery(collectionName, expression)
          .then((query) => {
            query.unsubscribe(channel);
          });
        break;

      case 'qsync':
        this.querySet
          .getOrCreateQuery(collectionName, expression)
          .then((query) => {
            query.sync(channel);
          });
        break;

      case 'sync':
        this.docSet
          .getOrCreateDoc(collectionName, docId)
          .then((doc) => {
            doc.sync(channel, version, value);
          });
        break;

      case 'add':
      case 'set':
      case 'del':
        this.docSet
          .getOrCreateDoc(collectionName, docId)
          .then((doc) => {
            doc.onOp(message, channel);

            doc.once('saved', () => {
              let op = {
                id: id,
                type: 'ack'
              }
              channel.send(op);
              this.querySet.onOp(message);
            });
          });
        break;

      default:
    }
  }

  modelMiddleware() {
    let store = this;
    function modelMiddleware(req, res, next) {
      let model;

      function getModel() {
        if (model) return model;
        model = store.createModel({fetchOnly: true}, req);
        return model;
      }
      req.getModel = getModel;

      function closeModel() {
        req.getModel = () => {};
        res.removeListener('finish', closeModel);
        res.removeListener('close', closeModel);
        model && model.close();
        model = null;
      }
      function closeModelAfterTimeout() {
        setTimeout(closeModel, 125000);
      }
      res.on('finish', closeModel);
      res.on('close', closeModelAfterTimeout);

      next();
    }
    return modelMiddleware;
  }
}

export default Store;
