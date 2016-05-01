import { MongoStorage } from '../../src/mongo/server'
import { RedisPubsub } from '../../src/redis'
import { Store } from '../../src/server'

const MONGO_URL = 'mongodb://localhost:27017/test'
const REDIS_URL = 'redis://localhost:6379/15'

let storage = new MongoStorage(MONGO_URL)
let pubsub = new RedisPubsub(REDIS_URL)

const options = {
  version: 1,
  storage,
  pubsub,
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
        id: true,
        email: true,
        name: true
      }
    }
  }
}

let store = new Store(options)

export default store
