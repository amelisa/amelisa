import assert from 'assert';
import { MemoryStorage, MongoStorage, ServerSocketChannel, Store } from '../lib';
import { source, collectionName, docId, expression, field, value } from './util';

let storage;
let store;
let model;
let model2;

describe('multymodel', () => {

  beforeEach((done) => {
    storage = new MemoryStorage();
    storage
      .init()
      .then(() => {
        store = new Store(storage);
        model = store.createModel();
        model.source = 'model1';
        model2 = store.createModel();
        model2.source = 'model2';
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
