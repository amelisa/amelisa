import http from 'http';
import { EventEmitter } from 'events';
import { MemoryStorage, MongoStorage, RedisChannel, ServerSocketChannel, Store } from '../../lib';

EventEmitter.prototype._maxListeners = 1000;

let port = 3000;
let mongoUrl = 'mongodb://localhost:27017/test';
let redisUrl = 'redis://localhost:6379/15';

let storage = new MongoStorage(mongoUrl);
let redis = new RedisChannel(redisUrl);
let pubsub = new RedisChannel(redisUrl);

storage
  .init()
  .then(() => redis.init())
  .then(() => pubsub.init(true))
  .then(() => {
    let store = new Store(storage, redis, pubsub);

    let httpServer = http.createServer();

    let app = require('./app')(store, httpServer);

    app.ws('/', (client, req) => {
      let channel = new ServerSocketChannel(client, req);
      store.client(channel);
    });

    httpServer.on('request', app);

    httpServer.listen(port, (err) => {
      if (err) {
        console.error('Can\'t start server, Error:', err);
      } else {
        console.info(`${process.pid} listening. Go to: http://localhost:${port}`);
      }
    });
  });
