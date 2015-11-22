import assert from 'assert'
import { MemoryStorage, Store } from '../src'
import { collectionName, docId, expression, field, value } from './util'
import ServerChannel from '../src/ServerChannel'

let storage
let channel
let channel2
let store
let store2
let model
let model2

describe('multystore', () => {
  beforeEach(() => {
    storage = new MemoryStorage()
    channel = new ServerChannel()
    channel2 = new ServerChannel()
    channel.pipe(channel2).pipe(channel)
    return storage
      .init()
      .then(() => {
        store = new Store(storage, channel, channel2, {source: 'store1'})
        store2 = new Store(storage, channel, channel2, {source: 'store2'})
        model = store.createModel()
        model2 = store2.createModel()
      })
  })

  it('should subscribe doc and get it', () => {
    let subscribes = [[collectionName, docId]]

    return model
      .subscribe(subscribes)
      .then((subscription) => {
        let data = subscription.get()
        let doc = data[0]
        assert(!doc)

        let docData = {
          _id: docId,
          [field]: value
        }

        return new Promise((resolve, reject) => {
          subscription.on('change', () => {
            let data = subscription.get()
            doc = data[0]
            assert(doc)

            resolve()
          })

          model2.add(collectionName, docData)
        })
      })
  })

  it('should subscribe query and get it', () => {
    let subscribes = [[collectionName, expression]]

    return model
      .subscribe(subscribes)
      .then((subscription) => {
        let data = subscription.get()
        let query = data[0]
        assert.equal(query.length, 0)

        let doc = {
          _id: docId,
          [field]: value
        }

        return new Promise((resolve, reject) => {
          subscription.on('change', () => {
            let data = subscription.get()
            let query = data[0]
            assert.equal(query.length, 1)

            resolve()
          })

          model2.add(collectionName, doc)
        })
      })
  })
})
