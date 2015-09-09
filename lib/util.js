let isServer = process.title !== 'browser';

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

export default {
  arrayRemove,
  clone,
  fastEqual,
  isServer,
  shallowClone,
  serverRequire
}
