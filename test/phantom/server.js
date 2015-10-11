process.env.DEBUG = '*,-express:*';
let http = require('http');
let { MongoStorage, RedisChannel, ServerSocketChannel, Store } = require('../../lib');
/*
import http from 'http';
import ws from 'ws';
import { MongoStorage, Store } from 'engine';
import app from './server/app';
*/

let port = 6003; // 3010 + Math.floor(Math.random() * 10);
let mongoUrl = 'mongodb://localhost:27017/test';
let redisUrl = 'redis://localhost:6379/13';

let storage = new MongoStorage(mongoUrl);
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

      let url = 'localhost:' + port;
      let httpServer = http.createServer();
      let app = require('./app')(store, httpServer, mongoUrl, url);
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
        serverDone(err, url, httpServer);
      });
    });
}
