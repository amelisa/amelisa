import assert from 'assert';
import { MemoryStorage, MongoStorage, ServerSocketChannel, Store } from '../lib';
import { source, collectionName, docId, expression, field, value } from './util';
import ServerChannel from '../lib/ServerChannel';

let storage;
let channel;
let channel2;
let store;
let store2;
let model;
let model2;

describe('multystore', () => {

  beforeEach((done) => {
    storage = new MemoryStorage();
    channel = new ServerChannel();
    channel2 = new ServerChannel();
    channel.pipe(channel2).pipe(channel);
    storage
      .init()
      .then(() => {
        store = new Store(storage, channel, channel2, {source: 'store1'});
        store2 = new Store(storage, channel, channel2, {source: 'store2'});
        model = store.createModel();
        model2 = store2.createModel();
        done();
      });
  });

  it('should subscribe doc and get it', (done) => {
    let subscribes = [[collectionName, docId]];

    model
      .subscribe(subscribes)
      .then((subscription) => {
        let data = subscription.get();
        let doc = data[0]
        assert(!doc);

        let docData = {
          _id: docId,
          [field]: value
        }

        model2.add(collectionName, docData);

        subscription.on('change', () => {
          let data = subscription.get();
          doc = data[0];
          assert(doc);

          done();
        });
      });
  });

  it('should subscribe query and get it', (done) => {
    let subscribes = [[collectionName, expression]];

    model
      .subscribe(subscribes)
      .then((subscription) => {
        let data = subscription.get();
        let query = data[0];
        assert.equal(query.length, 0);

        let doc = {
          _id: docId,
          [field]: value
        }

        model2.add(collectionName, doc);

        subscription.on('change', () => {
          let data = subscription.get();
          let query = data[0];
          assert.equal(query.length, 1);

          done();
        });
      });
  });
});
