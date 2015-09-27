import assert from 'assert';
import { MemoryStorage, MongoStorage, ServerSocketChannel, Store } from '../lib';
import { source, collectionName, docId, expression, field, value } from './util';
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

  it('should not send ops', (done) => {
    let queries = {
      doc: [collectionName, docId]
    }

    let subscription = model.subscribe(queries);

    let doc = {
      _id: docId,
      [field]: value
    }

    model2.channel.emit('close');

    model2.add('_' + collectionName, doc);
    assert(model2.get('_' + collectionName, docId));

    setTimeout(() => {
      assert(!model.get('_' + collectionName, docId));
      done();
    }, 10);
  });
});
