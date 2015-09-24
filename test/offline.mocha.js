import assert from 'assert';
import { MemoryStorage, MongoStorage, ServerSocketChannel, Store } from '../lib';
import { source, collectionName, docId, expression, field, value } from './util';
import ServerChannel from '../lib/ServerChannel';

let storage;
let store;
let model;
let model2;

describe('offline', () => {

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

  it('should send ops on online', (done) => {
    let queries = {
      doc: [collectionName, docId]
    }

    let subscription = model.subscribe(queries);

    let doc = {
      _id: docId,
      [field]: value
    }

    model2.channel.emit('close');

    model2.add(collectionName, doc);

    setTimeout(() => {
      assert(!model.get(collectionName, docId));

      model2.channel.emit('open');

      setTimeout(() => {
        assert(model.get(collectionName, docId));
        done();
      }, 10);
    }, 10);
  });

  it('should receive ops on online', (done) => {
    let queries = {
      doc: [collectionName, docId]
    }

    let subscription = model.subscribe(queries);

    setTimeout(() => {
      let doc = {
        _id: docId,
        [field]: value
      }

      model.channel.emit('close');
      model.channel.pipedChannel.emit('close');

      model2.add(collectionName, doc);

      setTimeout(() => {
        assert(!model.get(collectionName, docId));

        let channel2 = new ServerChannel();
        model.channel.pipe(channel2).pipe(model.channel);
        store.client(channel2);
        model.channel.emit('open');

        setTimeout(() => {
          assert(model.get(collectionName, docId));
          done();
        }, 10);
      }, 10);
    }, 10);
  });
});
