let http = require('http');
let { MongoStorage, MemoryStorage, RedisChannel, ServerSocketChannel, Store } = require('../../../lib');

const mongoUrl = 'mongodb://localhost:27017/test';
const redisUrl = 'redis://localhost:6379/13';

// let storage = new MongoStorage(mongoUrl);
let storage = new MemoryStorage();
let redis = new RedisChannel(redisUrl);
let pubsub = new RedisChannel(redisUrl);

export default function(serverDone) {
  storage
    .init()
    .then(() => redis.init())
    .then(() => pubsub.init(true))
    .then(() => {

      let options = {
        collections: {
          auths: {
            client: false
          },
          users: {
            client: true,
            preload: {}
          }
        },
        projections: {
          users: {
            collectionName: 'auths',
            fields: {
              _id: true,
              email: true,
              name: true
            }
          }
        }
      }

      let store = new Store(storage, redis, pubsub, options);

      store.hook = (op, session, params, done) => {
        //console.log('hook', op.type, session, params)
        if (op.type === 'del') {
          //return done('some error');
        }

        done();
      }

      let httpServer = http.createServer();
      let app = require('./app')(store, httpServer, mongoUrl);
      app.ws('/', (client, req) => {
        let channel = new ServerSocketChannel(client, req);
        store.onChannel(channel);
      });

      httpServer.on('request', app);

      serverDone(null, httpServer, store);
    });
}
