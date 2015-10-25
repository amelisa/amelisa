// let debug = require('debug')('UrlQuery');
import superagent from 'superagent';
import { EventEmitter } from 'events';

class UrlQuery extends EventEmitter {
  constructor(url, defaultValue, model) {
    super();
    this.url = url;
    this.defaultValue = defaultValue;
    this.model = model;
  }

  get() {
    return this.value;
  }

  load() {
    return new Promise((resolve, reject) => {
      if (!this.model.online) {
        this.value = this.defaultValue;
        resolve();
      } else {
        superagent
          .get(this.url)
          .set('Accept', 'application/json')
          .end((err, res) => {
            if (err) return reject(err);

            if (!res.ok) return reject(res.body && res.body.message);

            this.value = res.body;
            resolve();
          });
      }
    });
  }

  fetch() {
    return this.load();
  }

  subscribe() {
    return this.load();
  }

  unsubscribe() {
    return Promise.resolve();
  }
}

export default UrlQuery;
