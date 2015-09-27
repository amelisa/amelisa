let isServer = process.title !== 'browser';

let dbFields = {
  _ops: true,
  _sv: true,
  _v: true
}

function arrayRemove(array, el) {
  let index = array.indexOf(el);
  if (index > -1) {
    array.splice(index, 1);
  }
  return index;
}

function serverRequire(module, id) {
  if (!isServer) return;
  return module.require(id);
}

function clone(object) {
  return JSON.parse(JSON.stringify(object));
}

function shallowClone(object) {
  let out = {};
  for (let key in object) {
    out[key] = object[key];
  }
  return out;
}

function fastEqual(object1, object2) {
  return JSON.stringify(object1) === JSON.stringify(object2);
}

function isLocalCollection(collectionName) {
  let firstLetter = collectionName[0];
  return firstLetter === '_' || firstLetter === '$';
}

export default {
  arrayRemove,
  clone,
  dbFields,
  fastEqual,
  isServer,
  shallowClone,
  serverRequire,
  isLocalCollection
}
