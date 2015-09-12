let debug = require('debug')('MongoStorage');
import { MongoClient } from 'mongodb';
import util from './util';
import MongoQueries from './MongoQueries';

class MongoStorage extends MongoQueries {
  constructor(url) {
    super();
    this.url = url;
  }

  init() {
    return new Promise((resolve, reject) => {
      MongoClient.connect(this.url, (err, db) => {
        if (err) return reject(err);

        this.db = db;
        resolve();
      });
    });
  }

  clear() {
    return new Promise((resolve, reject) => {
      this.db.dropDatabase((err, result) => {
        if (err) return reject(err);

        resolve();
      });
    });
  }

  getDocById(collectionName, docId) {
    let query = {
      _id: docId
    };

    return new Promise((resolve, reject) => {
      this.db
        .collection(collectionName)
        .findOne(query, (err, doc) => {
          if (err) return reject(err);

          resolve(doc);
        });
    });
  }

  getDocsByQuery(collectionName, expression) {
    // debug('getDocsByQuery', collectionName, expression);
    let query = this.normalizeQuery(expression);
    let projection = {};
    let collection = this.db.collection(collectionName);

    return new Promise((resolve, reject) => {

      if (query.$count) {
        collection.count(query.$query || {}, (err, extra) => {
          if (err) return reject(err);
          resolve(extra);
        });
        return;
      }

      if (query.$distinct) {
        collection.distinct(query.$field, query.$query || {}, (err, extra) => {
          if (err) return reject(err);
          resolve(extra);
        });
        return;
      }

      if (query.$aggregate) {
        collection.aggregate(query.$aggregate, (err, extra) => {
          if (err) return reject(err);
          resolve(extra);
        });
        return;
      }

      if (query.$mapReduce) {
        var mapReduceOptions = {
          query: query.$query || {},
          out: {inline: 1},
          scope: query.$scope || {}
        };
        collection.mapReduce(query.$map, query.$reduce, mapReduceOptions, (err, extra) => {
          if (err) return reject(err);
          resolve(extra);
        });
        return;
      }
      collection.find(query, projection, query.$findOptions).toArray((err, docs) => {
        if (err) return reject(err);

        resolve(docs);
      });
    });
  }

  saveDoc(collectionName, docId, prevVersion, version, state, ops) {
    let query = {
      _id: docId,
      _v: prevVersion
    };

    let update = {
      $set: {
        _ops: ops,
        _v: version
      }
    };

    for (let key in state) {
      update.$set[key] = state[key];
    }

    let options = {
      new: true
    };

    if (!prevVersion) {
      options.upsert = true;
    }

    return new Promise((resolve, reject) => {
      this.db
        .collection(collectionName)
        .findAndModify(query, [], update, options, (err, doc) => {
          if (err) return reject(err);

          if (!doc) {
            return reject('version changed');
          }

          resolve();
        });
    });
  }
}

export default MongoStorage;
