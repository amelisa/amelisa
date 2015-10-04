import assert from 'assert';
import { MemoryStorage, MongoStorage, ServerSocketChannel, Store } from '../lib';
import { source, collectionName, dbCollectionName, docId, expression, field, value } from './util';

let storage;
let store;
let model;
let model2;
let options = {
  projections: {
    [collectionName]: {
      collectionName: dbCollectionName,
      fields: {
        _id: true,
        [field]: true
      }
    }
  }
}

describe('projections', () => {

  beforeEach(() => {
    storage = new MemoryStorage();
    return storage
      .init()
      .then(() => {
        store = new Store(storage, null, null, options);
        model = store.createModel();
        model.source = 'model1';
        model2 = store.createModel();
        model2.source = 'model2';
      });
  });

  it('should subscribe to projected doc', () => {
    let subscribes = [[collectionName, docId]];

    return model
      .subscribe(subscribes)
      .then((subscription) => {
        let data = subscription.get();
        let doc = data[0];
        assert(!doc);

        let docData = {
          _id: docId,
          [field]: value,
          age: 14
        }

        return new Promise((resolve, reject) => {
          model2.add(dbCollectionName, docData);

          subscription.on('change', () => {
            assert(model.get(collectionName, docId, field));
            assert(!model.get(collectionName, docId, 'age'));

            resolve();
          });
        });
      });
  });

  it('should subscribe to projected query', () => {
    let subscribes = [[collectionName, expression]];

    return model
      .subscribe(subscribes)
      .then((subscription) => {
        let data = subscription.get();
        let query = data[0];
        assert(!query.length);

        let doc = {
          _id: docId,
          [field]: value,
          age: 14
        }

        return new Promise((resolve, reject) => {
          model2.add(dbCollectionName, doc);

          subscription.on('change', () => {
            let docs = model.query(collectionName, expression).get();
            assert.equal(docs.length, 1);
            assert.equal(docs[0][field], value);
            assert.equal(docs[0].age, undefined);

            resolve();
          });
        });
      });
  });

  it('should add projected doc to projected collection', () => {
    let doc = {
      _id: docId,
      [field]: value
    }

    return model.add(collectionName, doc);
  });

  it('should not add not projected doc to projected collection', () => {
    let doc = {
      _id: docId,
      [field]: value,
      age: 14
    }

    return model
      .add(collectionName, doc)
      .catch((err) => {
        assert(err);
      });
  });

  it('should mutate on projected field in projected collection', () => {
    let doc = {
      _id: docId,
      [field]: value
    }

    return model
      .add(collectionName, doc)
      .then(() => model.set([collectionName, docId, field], 'Vasya'));
  });

  it('should not mutate on not projected field in projected collection', () => {
    let doc = {
      _id: docId,
      [field]: value
    }

    return model
      .add(collectionName, doc)
      .then(() => model.set([collectionName, docId, 'age'], 15))
      .catch((err) => {
        assert(err);
      });
  });
});
