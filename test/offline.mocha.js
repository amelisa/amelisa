import assert from 'assert';
import { MemoryStorage, MongoStorage, ServerSocketChannel, Store } from '../lib';
import { source, collectionName, docId, expression, countExpression, field, value } from './util';
import ServerChannel from '../lib/ServerChannel';

let storage;
let store;
let model;
let model2;

describe('offline', () => {

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

  it('should send ops on online when subscribed to doc', () => {
    let subscribes = [[collectionName, docId]];

    return model
      .subscribe(subscribes)
      .then((subscription) => {
        let doc = {
          _id: docId,
          [field]: value
        }

        model2.channel.emit('close');

        model2.add(collectionName, doc);

        return new Promise((resolve, reject) => {
          setTimeout(() => {
            assert.equal(model.get(collectionName, docId), undefined);

            model2.channel.emit('open');

            setTimeout(() => {
              assert(model.get(collectionName, docId));
              resolve();
            }, 10);
          }, 10);
        });
      });
  });

  it('should send ops on online when subscribed to query', () => {
    let subscribes = [[collectionName, expression]];

    return model
      .subscribe(subscribes)
      .then((subscription) => {
        let doc = {
          _id: docId,
          [field]: value
        }

        model2.channel.emit('close');

        model2.add(collectionName, doc);

        return new Promise((resolve, reject) => {
          setTimeout(() => {
            assert.equal(model.get(collectionName, docId), undefined);

            model2.channel.emit('open');

            setTimeout(() => {
              assert(model.get(collectionName, docId));
              resolve();
            }, 10);
          }, 10);
        });
      });
  });

  it('should receive ops on online when subscribed to doc', () => {
    let subscribes = [[collectionName, docId]];

    return model
      .subscribe(subscribes)
      .then((subscription) => {
        return new Promise((resolve, reject) => {
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
              store.onChannel(channel2);
              model.channel.emit('open');

              setTimeout(() => {
                assert(model.get(collectionName, docId));
                resolve();
              }, 10);
            }, 10);
          }, 10);
        });
      });
  });

  it('should receive ops on online when subscribed to query', () => {
    let subscribes = [[collectionName, expression]];

    return model
      .subscribe(subscribes)
      .then((subscription) => {
        return new Promise((resolve, reject) => {
          setTimeout(() => {
            let doc = {
              _id: docId,
              [field]: value
            }

            model.channel.emit('close');
            model.channel.pipedChannel.emit('close');

            model2.add(collectionName, doc);

            setTimeout(() => {
              assert.equal(model.getQuery(collectionName, expression).length, 0);

              let channel2 = new ServerChannel();
              model.channel.pipe(channel2).pipe(model.channel);
              store.onChannel(channel2);
              model.channel.emit('open');

              setTimeout(() => {
                assert.equal(model.getQuery(collectionName, expression).length, 1);
                resolve();
              }, 10);
            }, 10);
          }, 10);
        });
      });
  });

  it('should receive ops on online when subscribed to count query', () => {
    let subscribes = [[collectionName, countExpression]];

    return model
      .subscribe(subscribes)
      .then((subscription) => {
        return new Promise((resolve, reject) => {
          setTimeout(() => {
            let doc = {
              _id: docId,
              [field]: value
            }

            model.channel.emit('close');
            model.channel.pipedChannel.emit('close');

            model2.add(collectionName, doc);

            setTimeout(() => {
              assert.equal(model.getQuery(collectionName, countExpression), 0);

              let channel2 = new ServerChannel();
              model.channel.pipe(channel2).pipe(model.channel);
              store.onChannel(channel2);
              model.channel.emit('open');

              setTimeout(() => {
                assert.equal(model.getQuery(collectionName, countExpression), 1);
                resolve();
              }, 10);
            }, 10);
          }, 10);
        });
      });
  });

  it('should send and receive ops on online when subscribed to doc', () => {
    let subscribes = [[collectionName, docId]];

    return model
      .subscribe(subscribes)
      .then((subscription) => {
        return new Promise((resolve, reject) => {
          setTimeout(() => {
            let doc = {
              _id: docId,
              [field]: value
            }

            model.channel.emit('close');
            model.channel.pipedChannel.emit('close');

            model2.channel.emit('close');
            model2.channel.pipedChannel.emit('close');

            model2.add(collectionName, doc);

            setTimeout(() => {
              assert(!model.get(collectionName, docId));

              let channel2 = new ServerChannel();
              model.channel.pipe(channel2).pipe(model.channel);
              store.onChannel(channel2);
              model.channel.emit('open');

              let channel3 = new ServerChannel();
              model2.channel.pipe(channel3).pipe(model2.channel);
              store.onChannel(channel3);
              model2.channel.emit('open');

              setTimeout(() => {
                assert(model.get(collectionName, docId));
                resolve();
              }, 10);
            }, 10);
          }, 10);
        });
      });
  });

  it('should send and receive ops on online when subscribed to query', () => {
    let subscribes = [[collectionName, expression]];

    return model
      .subscribe(subscribes)
      .then((subscription) => {
        return new Promise((resolve, reject) => {
          setTimeout(() => {
            let doc = {
              _id: docId,
              [field]: value
            }

            model.channel.emit('close');
            model.channel.pipedChannel.emit('close');

            model2.channel.emit('close');
            model2.channel.pipedChannel.emit('close');

            model2.add(collectionName, doc);

            setTimeout(() => {
              assert.equal(model.getQuery(collectionName, expression).length, 0);

              let channel3 = new ServerChannel();
              model2.channel.pipe(channel3).pipe(model2.channel);
              store.onChannel(channel3);
              model2.channel.emit('open');

              setTimeout(() => {
                assert.equal(model.getQuery(collectionName, expression).length, 0);

                let channel2 = new ServerChannel();
                model.channel.pipe(channel2).pipe(model.channel);
                store.onChannel(channel2);
                model.channel.emit('open');

                setTimeout(() => {
                  assert.equal(model.getQuery(collectionName, expression).length, 1);
                  resolve();
                }, 10);
              }, 10);
            }, 10);
          }, 10);
        });
      });
  });

  it('should send and receive ops on online when subscribed to count query', () => {
    let subscribes = [[collectionName, countExpression]];

    return model
      .subscribe(subscribes)
      .then((subscription) => {
        return new Promise((resolve, reject) => {
          setTimeout(() => {
            let doc = {
              _id: docId,
              [field]: value
            }

            model.channel.emit('close');
            model.channel.pipedChannel.emit('close');

            model2.channel.emit('close');
            model2.channel.pipedChannel.emit('close');

            model2.add(collectionName, doc);

            setTimeout(() => {
              assert.equal(model.getQuery(collectionName, countExpression), 0);

              let channel3 = new ServerChannel();
              model2.channel.pipe(channel3).pipe(model2.channel);
              store.onChannel(channel3);
              model2.channel.emit('open');

              setTimeout(() => {
                assert.equal(model.getQuery(collectionName, countExpression), 0);

                let channel2 = new ServerChannel();
                model.channel.pipe(channel2).pipe(model.channel);
                store.onChannel(channel2);
                model.channel.emit('open');

                setTimeout(() => {
                  assert.equal(model.getQuery(collectionName, countExpression), 1);
                  resolve();
                }, 10);
              }, 10);
            }, 10);
          }, 10);
        });
      });
  });

  it('should apply ops offline when subscribed to query', () => {
    let subscribes = [[collectionName, expression]];

    return model
      .subscribe(subscribes)
      .then((subscription) => {
        return new Promise((resolve, reject) => {
          setTimeout(() => {
            let doc = {
              _id: docId,
              [field]: value
            }

            model.channel.emit('close');
            model.channel.pipedChannel.emit('close');

            model.add(collectionName, doc);

            setTimeout(() => {
              let query = model.query(collectionName, expression);
              assert(model.get(collectionName, docId));
              assert.equal(query.get().length, 1);

              resolve();
            }, 10);
          }, 10);
        });
      });
  });

  it('should apply ops offline when subscribed to count query', () => {
    let subscribes = [[collectionName, countExpression]];

    return model
      .subscribe(subscribes)
      .then((subscription) => {
        return new Promise((resolve, reject) => {
          setTimeout(() => {
            let doc = {
              _id: docId,
              [field]: value
            }

            model.channel.emit('close');
            model.channel.pipedChannel.emit('close');

            model.add(collectionName, doc);

            setTimeout(() => {
              let query = model.query(collectionName, countExpression);
              assert(model.get(collectionName, docId));
              assert.equal(query.get(), 1);

              resolve();
            }, 10);
          }, 10);
        });
      });
  });
});
