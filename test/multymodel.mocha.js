import assert from 'assert';
import { MemoryStorage, MongoStorage, ServerSocketChannel, Store } from '../lib';
import { source, collectionName, docId, expression, joinExpression, field, value } from './util';

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

  it('should subscribe query, and get doc changes', () => {
    let subscribes = [[collectionName, expression]];
    let value2 = 'value2';

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
          subscription.once('change', () => {
            let data = subscription.get();
            query = data[0];
            assert.equal(query.length, 1);

            subscription.on('change', () => {
              assert.equal(model.get(collectionName, docId, field), value2);

              resolve();
            });
            model2.set([collectionName, docId, field], value2);
          });
          model2.add(collectionName, doc);
        });
      });
  });

  it('should subscribe join query and get it', () => {
    let subscribes = [[collectionName, joinExpression]];

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

        let category = {
          _id: '1',
          userId: docId
        }

        return new Promise((resolve, reject) => {
          subscription.once('change', () => {
            let data = subscription.get();
            query = data[0];
            assert.equal(query.length, 1);

            subscription.once('change', () => {
              let data = subscription.get();
              query = data[0];
              assert.equal(query.length, 0);

              subscription.once('change', () => {
                let data = subscription.get();
                query = data[0];
                assert.equal(query.length, 1);

                resolve();
              });
              let user2 = {
                _id: '2',
                [field]: value
              }
              model2.add(collectionName, user2);
            });
            model2.set(['categories', '1', 'userId'], '2');
          });

          model2.add(collectionName, doc);
          model2.add('categories', category);
        });
      });
  });
});
