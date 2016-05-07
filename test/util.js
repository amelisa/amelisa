import MemoryStorage from 'amelisa-mongo/MemoryStorage'
// import MongoStorage from 'amelisa-mongo/MongoStorage'
// import RethinkStorage from 'amelisa-mongo/RethinkStorage'
import MemoryPubsub from 'amelisa-redis/MemoryPubsub'
// import RedisPubsub from 'amelisa-redis/RedisPubsub'

let source = 'source'
let source2 = 'source2'
let collectionName = 'users'
let dbCollectionName = 'auths'
let localCollectionName = '_users'
let docId = '1'
let expression = {}
let countExpression = {$count: true}
let joinExpression = {id: '$categories.1.userId'}
let field = 'name'
let field2 = 'firstName'
let value = 'Ivan'
let value2 = 'Vasya'
let numValue = 4
let arrayValue = [1, 2]

async function getStorage () {
  let storage
  storage = new MemoryStorage()
  // storage = new MongoStorage('mongodb://localhost:27017/test')
  // storage = new RethinkStorage('rethinkdb://localhost:28015/test')
  await storage.init()
  await storage.clear()
  return storage
}

function getStorageSync () {
  return new MemoryStorage()
  // return MongoStorage('mongodb://localhost:27017/test')
  // return RethinkStorage('rethinkdb://localhost:28015/test')
}

function getPubsub () {
  return new MemoryPubsub()
  // return new RedisPubsub()
}

function getDocData (data) {
  let docData = {
    id: docId,
    [field]: value
  }
  return {...docData, ...data}
}

function sleep (ms = 0) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export default {
  getStorage,
  getStorageSync,
  getPubsub,
  source,
  source2,
  collectionName,
  dbCollectionName,
  localCollectionName,
  docId,
  expression,
  countExpression,
  joinExpression,
  field,
  field2,
  value,
  value2,
  numValue,
  arrayValue,
  getDocData,
  sleep
}
