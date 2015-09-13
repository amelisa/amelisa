import assert from 'assert';
import MongoStorage from '../lib/MongoStorage';
import { source, collectionName, docId, field, value } from './util';

let mongoUrl = 'mongodb://localhost:27017/test';
let storage = new MongoStorage(mongoUrl);

describe('MongoStorage', () => {

  before(() => {
    return storage.init();
  });

  beforeEach(() => {
    return storage.clear();
  });

  it('should save and get doc', (done) => {
    let prevVersion = null;
    let version = '2';
    let state = {
      [field]: value
    };
    let ops = [];
    storage
      .saveDoc(collectionName, docId, prevVersion, version, state, ops)
      .then(() => {
        storage
          .getDocById(collectionName, docId)
          .then((doc) => {
            assert(doc);
            assert.equal(doc._id, docId);
            assert.equal(doc._v, version);
            assert.equal(doc[field], value);
            done();
          });
      });
  });

  it('should save and get docs', (done) => {
    let prevVersion = null;
    let version = '2';
    let state = {
      [field]: value
    };
    let ops = [];
    storage
      .saveDoc(collectionName, docId, prevVersion, version, state, ops)
      .then(() => {
        storage
          .getDocsByQuery(collectionName, {[field]: value})
          .then((docs) => {
            assert(docs);
            assert.equal(docs.length, 1);
            assert.equal(docs[0]._id, docId);
            assert.equal(docs[0]._v, version);
            assert.equal(docs[0][field], value);
            done();
          });
      });
  });
});
