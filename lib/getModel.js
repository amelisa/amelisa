import uuid from 'uuid';
import IndexedDbStorage from './IndexedDbStorage';
import Model from './Model';
import WebSocketChannel from './WebSocketChannel';
import util from './util';

let model;

function getModel() {
  if (model) return model;

  let wsUrl = 'ws://' + location.host;
  let ReconnectingWebSocket = require('reconnectingwebsocket');

  // TODO: reconnection interval should be random
  let wsOptions = {
    automaticOpen: false,
    reconnectInterval: 3000
  };
  let ws = new ReconnectingWebSocket(wsUrl, null, wsOptions);
  let channel = new WebSocketChannel(ws);

  model = new Model(channel);

  window.model = model;

  let storage;

  util
    .onDomReady()
    .then(() => {
      model.unbundleLocalData();

      let { clientStorage, collectionNames } = model.get('_app');

      if (clientStorage) {
        // Delete data of local collections to create them later with storage
        delete model.collectionSet.data['_app'];
        delete model.collectionSet.data['_session'];
        storage = new IndexedDbStorage(Array.from(collectionNames).concat(['_app', '_session']));
        model.storage = storage;
        model.collectionSet.storage = storage;
        model.querySet.storage = storage;

        return model.collectionSet
          .fillLocalCollectionsFromClientStorage()
          .then(() => {
            model.unbundleLocalData();

            return storage.init();
          });
      }

      return Promise.resolve();
    })
    .then(() => {
      if (!storage) return Promise.resolve();

      let projectionHashes = model.get('_app.projectionHashes');
      let prevProjectionHashes = model.get('_app.prevProjectionHashes');

      let promises = [];

      for (let collectionName in prevProjectionHashes) {
        let prevHash = prevProjectionHashes[collectionName];
        let hash = projectionHashes[collectionName];

        if (!hash || prevHash !== hash) {
          promises.push(storage.clearCollection(collectionName));
        }
      }

      return Promise.all(promises);
    })
    .then(() => model.init())
    .then(() => {
      let source = model.get('_app.source');
      if (!source) {
        source = model.id();
        model.source = source;
        model.set('_app.source', source);
      } else {
        model.source = source;
      }
    })
    .then(() => {
      let projectionHashes = model.get('_app.projectionHashes');
      delete projectionHashes._id;
      return model.set('_app.prevProjectionHashes', projectionHashes);
    })
    .then(() => {
      model.unbundleData();
      ws.open();
    })
    .catch((error) => {
      console.error(error, error.stack);
    });

  return model;
}

export default getModel;
