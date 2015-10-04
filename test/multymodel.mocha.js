import assert from 'assert';
import { MemoryStorage, MongoStorage, ServerSocketChannel, Store } from '../lib';
import { source, collectionName, docId, expression, field, value } from './util';

let storage;
let store;
let model;
let model2;

describe('multymodel', () => {

  beforeEach(() => {
    storage = new MemoryStorage();
    return storage
      .init()
      .then(() => {
        store = new Store(storage);
        model = store.createModel();
        model.source = 'model1';
        model2 = store.createModel();
        model2.source = 'model2';
      });
  });

  it('should subscribe doc and get it', () => {
    let subscribes = [[collectionName, docId]];

    return model
      .subscribe(subscribes)
      .then((subscription) => {
        let data = subscription.get();
        let doc = data[0];
        assert(!doc);

        let docData = {
          _id: docId,
          [field]: value
        }

        return new Promise((resolve, reject) => {
          subscription.on('change', () => {
            let data = subscription.get();
            let doc = data[0]
            assert(doc);
            resolve();
          });

          model2.add(collectionName, docData);
        });
      });
  });

  it('should subscribe query and get it', () => {
    let subscribes = [[collectionName, expression]];

    return model
      .subscribe(subscribes)
      .then((subscription) => {
        let data = subscription.get();
        let query = data[0];
        assert.equal(query.length, 0);

        let doc = {
          _id: docId,
          [field]: value
        }

        return new Promise((resolve, reject) => {
          subscription.on('change', () => {
            let data = subscription.get();
            query = data[0];
            assert.equal(query.length, 1);

            resolve();
          });

          model2.add(collectionName, doc);
        });

      });
  });
});
