import { MongoStorage, RedisChannel, Store } from '../../src'

const options = {
  version: 1,
  collections: {
    auths: {
      client: false
    },
    users: {
      client: true
    },
    items: {
      client: true
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
  },
  clientStorage: false
}

const MONGO_URL = 'mongodb://localhost:27017/test'
const REDIS_URL = 'redis://localhost:6379/15'

let storage = new MongoStorage(MONGO_URL)
let redis = new RedisChannel(REDIS_URL)
let pubsub = new RedisChannel(REDIS_URL)

let store = new Store(storage, redis, pubsub, options)

store.init = () => Promise.all([
  storage.init(),
  redis.init(),
  pubsub.init()
])

export default store
