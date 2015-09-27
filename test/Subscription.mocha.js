import assert from 'assert';
import { MemoryStorage, MongoStorage, ServerSocketChannel, Store } from '../lib';
import { source, collectionName, docId, expression, field, value } from './util';

let storage;
let store;
let model;

describe('Subscription', () => {

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
      let data = subscription.get();
      assert.equal(Object.keys(data).length, 1);
      assert.equal(data.doc, undefined);

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
        let data = subscription.get();
        assert.equal(Object.keys(data).length, 1);
        assert(data.doc);
        assert.equal(data.doc[field], value);

        assert.equal(model.get(collectionName, docId, field), value);
        done();
      });
    });
  });

  it('should subscribe add doc and ops', (done) => {
    let queries = {
      doc: [collectionName, docId]
    }

    let subscription = model.subscribe(queries);

    subscription.once('change', () => {
      let doc = {
        _id: docId,
        [field]: value
      }

      subscription.once('change', () => {
        subscription.once('change', () => {
          subscription.once('change', () => {
            subscription.once('change', () => {
              done();
            });
            model.del(collectionName, docId);
          });
          model.del(collectionName, docId, field);
        });
        model.set(collectionName, docId, field, value);
      });
      model.add(collectionName, doc);
    });
  });

  it('should subscribe empty query', (done) => {
    let queries = {
      query: [collectionName, expression]
    }

    let subscription = model.subscribe(queries);

    subscription.on('change', () => {
      let data = subscription.get();
      assert.equal(Object.keys(data).length, 1);
      assert(data.query);
      assert.equal(data.query.length, 0);

      let docs = model.query(collectionName, expression).get();
      assert.equal(docs.length, 0);
      done();
    });
  });

  it('should subscribe query', (done) => {
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
        let data = subscription.get();
        assert.equal(Object.keys(data).length, 1);
        assert(data.query);
        assert.equal(data.query.length, 1);
        assert.equal(data.query[0][field], value);

        let docs = model.query(collectionName, expression).get();
        assert.equal(docs.length, 1);
        assert.equal(docs[0][field], value);
        done();
      });
    });
  });

  it('should subscribe query and ops', (done) => {
    let queries = {
      query: [collectionName, expression]
    }

    let subscription = model.subscribe(queries);

    subscription.once('change', () => {
      let doc = {
        _id: docId,
        [field]: value
      }

      subscription.once('change', () => {
        done();
      });

      model.add(collectionName, doc);
    });
  });

  it('should subscribe doc and query', (done) => {
    let doc = {
      _id: docId,
      [field]: value
    }

    model.add(collectionName, doc, (err) => {
      let queries = {
        doc: [collectionName, docId],
        query: [collectionName, expression]
      }

      let subscription = model.subscribe(queries);

      subscription.on('change', () => {
        let data = subscription.get();
        assert.equal(Object.keys(data).length, 2);
        assert(data.doc);
        assert(data.query);
        assert.equal(data.doc[field], value);
        assert.equal(data.query.length, 1);
        assert.equal(data.query[0][field], value);

        assert.equal(model.get(collectionName, docId, field), value);

        let docs = model.query(collectionName, expression).get();
        assert.equal(docs.length, 1);
        assert.equal(docs[0][field], value);

        done();
      });
    });
  });

  it('should subscribe doc and query and ops', (done) => {
    let queries = {
      doc: [collectionName, docId],
      query: [collectionName, expression]
    }

    let subscription = model.subscribe(queries);

    subscription.once('change', () => {
      let doc = {
        _id: docId,
        [field]: value
      }

      // TODO: could we emit change once?
      subscription.once('change', () => {
        done();
      });

      model.add(collectionName, doc);
    });
  });
});
