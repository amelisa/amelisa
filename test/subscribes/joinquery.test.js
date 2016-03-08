import assert from 'assert'
import eventToPromise from 'event-to-promise'
import { MemoryStorage, Store } from '../../src/server'
import { collectionName, docId, joinExpression, getDocData } from '../util'

let storage
let store
let model
let model2

describe('subscribes join query', () => {
  beforeEach(async () => {
    storage = new MemoryStorage()
    await storage.init()

    store = new Store(storage, null, {saveDebounceTimeout: 0})
    model = store.createModel()
    model.source = 'model1'
    model2 = store.createModel()
    model2.source = 'model2'
  })

  it('should subscribe join query and get doc', async () => {
    let query = model.query(collectionName, joinExpression)
    await query.subscribe()
    setTimeout(() => model2.add(collectionName, getDocData()))
    setTimeout(() => model2.add('categories', getDocData({userId: docId})))
    await eventToPromise(query, 'change')

    assert.equal(query.get().length, 1)
  })

  it('should subscribe join query and handle changes', async () => {
    let query = model.query(collectionName, joinExpression)
    await query.subscribe()
    setTimeout(() => model2.add(collectionName, getDocData()))
    setTimeout(() => model2.add('categories', getDocData({userId: docId})))
    await eventToPromise(query, 'change')

    assert.equal(query.get().length, 1)

    setTimeout(() => model2.set(['categories', '1', 'userId'], '2'))
    await eventToPromise(query, 'change')

    assert.equal(query.get().length, 0)

    setTimeout(() => model2.add(collectionName, getDocData({_id: '2'})))
    await eventToPromise(query, 'change')

    assert.equal(query.get().length, 1)
  })
})
