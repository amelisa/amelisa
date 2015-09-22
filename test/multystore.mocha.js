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
    let queries = {
      doc: [collectionName, docId]
    }

    let subscription = model.subscribe(queries);

    subscription.once('change', () => {
      let data = subscription.get();
      assert(!data.doc);

      let doc = {
        _id: docId,
        [field]: value
      }

      model2.add(collectionName, doc);

      subscription.on('change', () => {
        let data = subscription.get();
        assert(data.doc);

        done();
      });
    });
  });

  it('should subscribe query and get it', (done) => {
    let queries = {
      query: [collectionName, expression]
    }

    let subscription = model.subscribe(queries);

    subscription.once('change', () => {
      let data = subscription.get();
      assert.equal(data.query.length, 0);

      let doc = {
        _id: docId,
        [field]: value
      }

      model2.add(collectionName, doc);

      subscription.on('change', () => {
        let data = subscription.get();
        assert.equal(data.query.length, 1);

        done();
      });
    });
  });
});
