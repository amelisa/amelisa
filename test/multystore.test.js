import assert from 'assert'
import eventToPromise from 'event-to-promise'
import { MemoryStorage, Store } from '../src/server'
import { collectionName, docId, expression, field, value } from './util'
import ServerChannel from '../src/server/ServerChannel'

let storage
let store
let store2
let model
let model2

describe('multystore', () => {
  beforeEach(async () => {
    storage = new MemoryStorage()
    await storage.init()

    let pub = new ServerChannel()
    let sub = new ServerChannel()
    pub.pipe(sub).pipe(pub)
    pub.open()

    store = new Store(storage, pub, sub, {source: 'store1'})
    store2 = new Store(storage, pub, sub, {source: 'store2'})
    model = store.createModel()
    model2 = store2.createModel()
  })

  it('should subscribe doc and get it', async () => {
    let subscribes = [[collectionName, docId]]

    let subscription = await model.subscribe(subscribes)

    let data = subscription.get()
    let doc = data[0]
    assert(!doc)

    let docData = {
      _id: docId,
      [field]: value
    }

    model2.add(collectionName, docData)

    await eventToPromise(subscription, 'change')

    data = subscription.get()
    doc = data[0]
    assert(doc)
  })

  it('should subscribe query and get it', async () => {
    let subscribes = [[collectionName, expression]]

    let subscription = await model.subscribe(subscribes)

    let data = subscription.get()
    let query = data[0]
    assert.equal(query.length, 0)

    let doc = {
      _id: docId,
      [field]: value
    }

    model2.add(collectionName, doc)

    await eventToPromise(subscription, 'change')

    data = subscription.get()
    query = data[0]
    assert.equal(query.length, 1)
  })
})
