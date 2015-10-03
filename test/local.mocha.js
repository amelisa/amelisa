import assert from 'assert';
import { MemoryStorage, MongoStorage, ServerSocketChannel, Store } from '../lib';
import { source, collectionName, localCollectionName, docId, expression, field, value } from './util';
import ServerChannel from '../lib/ServerChannel';

let storage;
let store;
let model;
let model2;

describe('local', () => {

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

  it('should not send ops for local doc', (done) => {
    let subscribes = [[localCollectionName, docId]];

    model
      .subscribe(subscribes)
      .then((subscription) => {
        let doc = {
          _id: docId,
          [field]: value
        }

        model2.add(localCollectionName, doc);
        assert(model2.get(localCollectionName, docId));
        assert.equal(model2.get(localCollectionName, docId, field), value);

        setTimeout(() => {
          assert(!model.get(localCollectionName, docId));
          done();
        }, 10);
      });
  });

  it('should not send ops for local query', (done) => {
    let subscribes = [[localCollectionName, expression]];

    model
      .subscribe(subscribes)
      .then((subscription) => {
        let doc = {
          _id: docId,
          [field]: value
        }

        model2.add(localCollectionName, doc);
        let docs = model2.getQuery(localCollectionName, expression);
        assert.equal(docs.length, 1);
        assert.equal(docs[0]._id, docId);

        setTimeout(() => {
          assert.equal(model.getQuery(localCollectionName, expression).length, 0);
          done();
        }, 10);
      });
  });
});
