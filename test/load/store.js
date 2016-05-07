import { Store } from '../../src/server'
import { getStorageSync, getPubsub } from '../util'

let storage = getStorageSync()
let pubsub = getPubsub()

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
