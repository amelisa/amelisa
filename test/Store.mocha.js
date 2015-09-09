let { MemoryStorage, MongoStorage, ServerSocketChannel, Store } = require('../lib');
import ServerChannel from '../lib/ServerChannel';

let storage;
let store;
let channel

beforeEach((done) => {
  storage = new MemoryStorage();
  storage
    .init()
    .then(() => {
      //if (err) return debug('storage error', err);

      store = new Store(storage);
      channel = new ServerChannel();
      let channel2 = new ServerChannel();
      channel.pipe(channel2).pipe(channel);
      store.client(channel2);
      done();
    });
});

describe('Store', () => {
  it('should sub to empty doc', (done) => {
    let op = {
      type: 'sub',
      collectionName: 'users',
      docId: '1',
      version: '1'
    };

    channel.on('message', (message) => {
      if (message.type === 'sub') done();
    })

    channel.send(op);
  });

  it('should sub to doc', (done) => {
    let op = {
      type: 'sub',
      collectionName: 'users',
      docId: '1',
      version: '1'
    };

    let collectionName = 'users';
    let docId = '1';
    let prevVersion = null;
    let version = '2';
    let state = {
      name: 'name'
    };
    let ops = [];
    storage
      .saveDoc(collectionName, docId, prevVersion, version, state, ops)
      .then(() => {
        channel.on('message', (message) => {
          if (message.type === 'sub') done();
        });

        channel.send(op);
      });

  });
});
