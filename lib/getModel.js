import IndexedDbStorage from './IndexedDbStorage';
import LocalStorage from './LocalStorage';
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

  let localStorage = new LocalStorage();
  let source = localStorage.getSource();

  model = new Model(channel, source);

  util
    .onDomReady()
    .then(() => {
      model.unbundleOptions();

      let { clientStorage, collectionNames } = model.options;

      if (clientStorage) {
        let storage = new IndexedDbStorage(collectionNames);
        model.storage = storage;
        model.collectionSet.storage = storage;
        model.querySet.storage = storage;
        return storage.init();
      }

      return Promise.resolve();
    })
    .then(() => model.init())
    .then(() => {
      model.unbundleData();
      ws.open();
    })
    .catch((err) => {
      console.error(err)
    });

  return model;
}

export default getModel;
