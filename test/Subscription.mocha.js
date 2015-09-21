import assert from 'assert';
import { MemoryStorage, MongoStorage, ServerSocketChannel, Store } from '../lib';
import { source, collectionName, docId, expression, field, value } from './util';

let storage;
let store;
let model;

describe('Integration', () => {

  beforeEach((done) => {
    storage = new MemoryStorage();
    storage
      .init()
      .then(() => {
        store = new Store(storage);
        model = store.createModel();
        done();
      });
  });

  it('should subscribe empty doc', (done) => {
    let queries = {
      doc: [collectionName, docId]
    }

    let subscription = model.subscribe(queries);

    subscription.on('change', () => {
      assert.equal(model.get(collectionName, docId), undefined);
      done();
    });
  });

  it('should subscribe doc', (done) => {
    let doc = {
      _id: docId,
      [field]: value
    }

    model.add(collectionName, doc, (err) => {
      assert.equal(err, undefined);

      let queries = {
        doc: [collectionName, docId]
      }

      let subscription = model.subscribe(queries);

      subscription.on('change', () => {
        assert.equal(model.get(collectionName, docId, field), value);
        done();
      });
    });
  });

  it('should subscribe empty query', (done) => {
    let queries = {
      query: [collectionName, expression]
    }

    let subscription = model.subscribe(queries);

    subscription.on('change', () => {
      let docs = model.query(collectionName, expression).get();
      assert.equal(docs.length, 0);
      done();
    });
  });

  it.only('should subscribe query', (done) => {
    let doc = {
      _id: docId,
      [field]: value
    }

    model.add(collectionName, doc, (err) => {
      let queries = {
        query: [collectionName, expression]
      }

      let subscription = model.subscribe(queries);

      subscription.on('change', () => {
        let docs = model.query(collectionName, expression).get();
        assert.equal(docs.length, 1);
        assert.equal(docs[0][field], value);
        done();
      });
    });
  });
});
