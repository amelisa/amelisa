import assert from 'assert'
import eventToPromise from 'event-to-promise'
import { MemoryStorage } from '../../src/mongo'
import { Store } from '../../src/server'
import { collectionName, docId, expression, field, value2, getDocData } from '../util'

let storage
let store
let model
let model2

describe('subscribes subscription', () => {
  beforeEach(async () => {
    storage = new MemoryStorage()
    store = new Store(storage, null, {saveDebounceTimeout: 0})
    await store.init()
    model = store.createModel()
    model2 = store.createModel()
  })

  it('should subscribe doc and get it', async () => {
    let doc = model.doc(collectionName, docId)
    let subscription = await model.subscribe([doc])
    setTimeout(() => model2.add(collectionName, getDocData()), 0)
    await eventToPromise(subscription, 'change')

    assert(subscription.get()[0])
  })

  it('should subscribe query and get it', async () => {
    let query = model.query(collectionName, expression)
    let subscription = await model.subscribe([query])
    setTimeout(() => model2.add(collectionName, getDocData()), 0)
    await eventToPromise(subscription, 'change')

    assert.equal(subscription.get()[0].length, 1)
  })

  it('should subscribe query, and get doc changes', async () => {
    let query = model.query(collectionName, expression)
    let subscription = await model.subscribe([query])
    setTimeout(() => model2.add(collectionName, getDocData()), 0)
    await eventToPromise(subscription, 'change')
    setTimeout(() => model2.set([collectionName, docId, field], value2), 0)
    await eventToPromise(subscription, 'change')

    assert.equal(subscription.get()[0].length, 1)
    assert.equal(subscription.get()[0][0][field], value2)
  })
})
