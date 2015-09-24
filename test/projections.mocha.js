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

  beforeEach((done) => {
    storage = new MemoryStorage();
    storage
      .init()
      .then(() => {
        store = new Store(storage, null, null, options);
        model = store.createModel();
        model.source = 'model1';
        model2 = store.createModel();
        model2.source = 'model2';
        done();
      });
  });

  it('should subscribe to projected doc', (done) => {
    let queries = {
      doc: [collectionName, docId]
    }

    let subscription = model.subscribe(queries);

    subscription.once('change', () => {
      let data = subscription.get();
      assert(!data.doc);

      let doc = {
        _id: docId,
        [field]: value,
        age: 14
      }

      model2.add(dbCollectionName, doc);

      subscription.on('change', () => {
        assert(model.get(collectionName, docId, field));
        assert(!model.get(collectionName, docId, 'age'));

        done();
      });
    });
  });

  it('should add projected doc to projected collection', (done) => {
    let doc = {
      _id: docId,
      [field]: value
    }

    model.add(collectionName, doc, (err) => {
      assert(!err);
      done();
    });
  });

  it('should not add not projected doc to projected collection', (done) => {
    let doc = {
      _id: docId,
      [field]: value,
      age: 14
    }

    model.add(collectionName, doc, (err) => {
      assert(err);
      done();
    });
  });

  it('should mutate on projected field in projected collection', (done) => {
    let doc = {
      _id: docId,
      [field]: value
    }

    model.add(collectionName, doc, (err) => {
      assert(!err);

      model.set(collectionName, docId, field, 'Vasya', (err) => {
        assert(!err);
        done();
      });
    });
  });

  it('should not mutate on not projected field in projected collection', (done) => {
    let doc = {
      _id: docId,
      [field]: value
    }

    model.add(collectionName, doc, (err) => {
      assert(!err);

      model.set(collectionName, docId, 'age', 15, (err) => {
        assert(err);
        done();
      });
    });
  });
});
