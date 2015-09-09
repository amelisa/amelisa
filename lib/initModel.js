import IndexedDbStorage from './IndexedDbStorage';
import LocalStorage from './LocalStorage';
import Model from './Model';
import WebSocketChannel from './WebSocketChannel';
import util from './util';

const collectionNames = ['users'];
let model;

if (util.isServer) {
  let channel = new WebSocketChannel({});

  model = new Model(channel, 'user1');
} else {
  let wsUrl = 'ws://localhost:3000';
  let ReconnectingWebSocket = require('reconnectingwebsocket');
  let wsOptions = {
    automaticOpen: false,
    reconnectInterval: 3000
  };
  let ws = new ReconnectingWebSocket(wsUrl, null, wsOptions);
  let channel = new WebSocketChannel(ws);
  let storage = new IndexedDbStorage(collectionNames);

  let localStorage = new LocalStorage();
  let source = localStorage.getSource();

  model = new Model(channel, source, storage);
  let data = {};

  storage.ready = () => {
    model
      .init(data)
      .then(() => {
        channel.once('open', () => {
          console.log('ready')
          model.emit('ready');
        });
        ws.open();
      });
  }
}

export default model;
