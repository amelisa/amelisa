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
    let subscribes = [[collectionName, docId]];

    model
      .subscribe(subscribes)
      .then((subscription) => {
        let data = subscription.get();
        assert.equal(data.length, 1);
        assert.equal(data[0], undefined);
        assert.equal(model.get(collectionName, docId), undefined);
        done();
      });
  });

  it('should subscribe doc', (done) => {
    let subscribes = [[collectionName, docId]];
    let doc = {
      _id: docId,
      [field]: value
    }

    model
      .add(collectionName, doc)
      .then(() => model.subscribe(subscribes))
      .then((subscription) => {
        let data = subscription.get();
        assert.equal(data.length, 1);
        let doc = data[0];
        assert(doc);
        assert.equal(doc[field], value);

        assert.equal(model.get(collectionName, docId, field), value);
        done();
      });
  });

  it('should subscribe add doc and ops', (done) => {
    let subscribes = [[collectionName, docId]];

    model
      .subscribe(subscribes)
      .then((subscription) => {
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
              model.del([collectionName, docId]);
            });
            model.del([collectionName, docId, field]);
          });
          model.set([collectionName, docId, field], value);
        });
        model.add(collectionName, doc);
      });
  });

  it('should subscribe empty query', (done) => {
    let subscribes = [[collectionName, expression]];

    model
      .subscribe(subscribes)
      .then((subscription) => {
        let data = subscription.get();
        assert.equal(data.length, 1);
        let query = data[0];
        assert(query);
        assert.equal(query.length, 0);

        let docs = model.query(collectionName, expression).get();
        assert.equal(docs.length, 0);
        done();
      });
  });

  it('should subscribe query', (done) => {
    let subscribes = [[collectionName, expression]];
    let doc = {
      _id: docId,
      [field]: value
    }

    model
      .add(collectionName, doc)
      .then(() => model.subscribe(subscribes))
      .then((subscription) => {
        let data = subscription.get();
        assert.equal(data.length, 1);
        let query = data[0]
        assert(query);
        assert.equal(query.length, 1);
        assert.equal(query[0][field], value);

        let docs = model.query(collectionName, expression).get();
        assert.equal(docs.length, 1);
        assert.equal(docs[0][field], value);
        done();
      });
  });

  it('should subscribe query and ops', (done) => {
    let subscribes = [[collectionName, expression]];

    model
      .subscribe(subscribes)
      .then((subscription) => {
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
    let subscribes = [[collectionName, docId], [collectionName, expression]];
    let docData = {
      _id: docId,
      [field]: value
    }

    model
      .add(collectionName, docData)
      .then(() => model.subscribe(subscribes))
      .then((subscription) => {
        let data = subscription.get();
        assert.equal(data.length, 2);
        let doc = data[0];
        let query = data[1];
        assert(doc);
        assert(query);
        assert.equal(doc[field], value);
        assert.equal(query.length, 1);
        assert.equal(query[0][field], value);

        assert.equal(model.get(collectionName, docId, field), value);

        let docs = model.query(collectionName, expression).get();
        assert.equal(docs.length, 1);
        assert.equal(docs[0][field], value);

        done();
      });
  });

  it('should subscribe doc and query and ops', (done) => {
    let subscribes = [[collectionName, docId], [collectionName, expression]];

    model
      .subscribe(subscribes)
      .then((subscription) => {
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

  it('should fetch doc when no array', (done) => {
    model
      .fetch(collectionName, docId)
      .then(() => done());
  });

  it('should fetch doc when path', (done) => {
    model
      .fetch(`${collectionName}.${docId}`)
      .then(() => done());
  });

  it('should fetch doc when array', (done) => {
    model
      .fetch([collectionName, docId])
      .then(() => done());
  });

  it('should fetch doc when array of arrays', (done) => {
    model
      .fetch([[collectionName, docId]])
      .then(() => done());
  });

  it('should subscribe doc when no array', (done) => {
    model
      .subscribe(collectionName, docId)
      .then(() => done());
  });

  it('should subscribe doc when path', (done) => {
    model
      .subscribe(`${collectionName}.${docId}`)
      .then(() => done());
  });

  it('should subscribe doc when array', (done) => {
    model
      .subscribe([collectionName, docId])
      .then(() => done());
  });

  it('should subscribe doc when array of arrays', (done) => {
    model
      .subscribe([[collectionName, docId]])
      .then(() => done());
  });
});
