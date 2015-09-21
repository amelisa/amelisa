import assert from 'assert';
import { MemoryStorage, MongoStorage, ServerSocketChannel, Store } from '../lib';
import ServerChannel from '../lib/ServerChannel';
import { source, collectionName, docId, field, value } from './util';

let storage;
let store;
let channel;

describe('Store', () => {

  beforeEach((done) => {
    storage = new MemoryStorage();
    storage
      .init()
      .then(() => {

        store = new Store(storage);
        channel = new ServerChannel();
        let channel2 = new ServerChannel();
        channel.pipe(channel2).pipe(channel);
        store.client(channel2);
        done();
      });
  });

  it('should sub to empty doc', (done) => {
    let op = {
      type: 'sub',
      collectionName: collectionName,
      docId: docId,
      version: '1'
    };

    channel.on('message', (message) => {
      assert.equal(message.type, op.type);
      done();
    })

    channel.send(op);
  });

  it('should sub to doc', (done) => {
    let op = {
      type: 'sub',
      collectionName: collectionName,
      docId: docId,
      version: '1'
    };

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
          assert.equal(message.type, op.type);
          done();
        });

        channel.send(op);
      });

  });
});
