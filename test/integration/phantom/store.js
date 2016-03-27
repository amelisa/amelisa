import { MemoryStorage } from '../../../src/mongo/server'
import { RedisPubsub } from '../../../src/redis'
import { Store } from '../../../src/server'

// const mongoUrl = 'mongodb://localhost:27017/test'
const redisUrl = 'redis://localhost:6379/13'

// let storage = new MongoStorage(mongoUrl)
let storage = new MemoryStorage()
let pubsub = new RedisPubsub(redisUrl)

const options = {
  version: 1,
  storage,
  pubsub,
  collections: {
    auths: {
      client: false
    },
    users: {
      client: true,
      preload: {}
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
  }
}

let store = new Store(options)

export default store
