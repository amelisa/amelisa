process.env.DEBUG = '*';
//process.env.DEBUG_FD = '1';
//require('debug').enable('*');
let debug = require('debug')('test');

//import Store from '../lib/Store';
let Store = require('../lib/Store');
let MongoStorage = require('../lib/MongoStorage');

let mongoUrl = 'mongodb://localhost:27017/engine';
let storage = new MongoStorage(mongoUrl, (err) => {
  if (err) return debug('storage error', err);

  let store = new Store(storage);
  let model = store.createModel();

  //debug(model.get('users', '123'));

  let collectionName = 'users';
  let docId = '2';

  let query = model.query(collectionName, {});
  query.subscribe();

  setTimeout(() => {
    model.subscribeDoc(collectionName, docId);
    model.set(collectionName, docId, 'age', 11);
  }, 1000);

  return;

  let user = {
    name: 'name 1'
  };


  model.add(collectionName, docId, user);
  model.set(collectionName, docId, 'age', 10);

  debug(model.get(collectionName, docId));

  //debug(model.data.users[2].version())
  debug(model.collectionSet.data.users.data[docId].version());

  model.subscribeDoc(collectionName, docId);

  setTimeout(() => {
    model.collectionSet.data.users.data[docId].unsubscribe();
    model.collectionSet.data.users.data[docId].unsubscribe();

    debug(model.get(collectionName, docId));
  }, 100);
});
