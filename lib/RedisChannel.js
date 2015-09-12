let debug = require('debug')('RedisChannel');
import { EventEmitter } from 'events';
import redisUrl from 'redis-url';

const channel = 'op';

class RedisChannel extends EventEmitter {
  constructor(url) {
    super();
    this.url = url;
  }

  init(pubsub) {
    let db = this.db = redisUrl.connect(this.url);
    return new Promise((resolve, reject) => {
      db.on('connect', () => {
        if (!pubsub) return resolve();

        db.on('subscribe', resolve);
        db.on('message', (channelName, message) => {
          this.emit('message', message);
        });
        db.subscribe(channel);
      });
    });
  }

  send(message) {
    this.db.publish(channel, message);
  }
}

export default RedisChannel;
