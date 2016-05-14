import assert from 'assert'
import eventToPromise from 'event-to-promise'
import { Store } from '../../src/server'
import { getStorage, collectionName, docId, joinExpression, field, getDocData } from '../util'

let storage
let store
let model
let model2

describe('offline joinquery', () => {
  beforeEach(async () => {
    storage = await getStorage()
    store = new Store({storage, saveDebounceTimeout: 0})
    await store.init()
    model = store.createModel({isClient: true})
    model2 = store.createModel({isClient: true})
    await model.onReady()
    await model2.onReady()
  })

  it('should send ops on online when subscribed to join query', async () => {
    let query = model.query(collectionName, joinExpression)
    await query.subscribe()
    model2.close()

    await model2.add(collectionName, getDocData())
    await model2.add('categories', getDocData({userId: docId}))

    assert.equal(query.get().length, 0)

    store.connectModel(model2)
    await eventToPromise(query, 'change')

    assert.equal(query.get().length, 1)
  })

  it('should receive ops on online when subscribed to query', async () => {
    let query = model.query(collectionName, joinExpression)
    await query.subscribe()
    model.close()
    await model2.add(collectionName, getDocData())
    await model2.add('categories', getDocData({userId: docId}))

    assert.equal(query.get().length, 0)

    store.connectModel(model)
    await eventToPromise(model, 'online')
    if (query.get().length !== 1) await eventToPromise(query, 'change')

    assert.equal(query.get().length, 1)
  })

  it('should send and receive ops on online when subscribed to query', async () => {
    let query = model.query(collectionName, joinExpression)
    await query.subscribe()
    model.close()
    model2.close()
    await model2.add(collectionName, getDocData())
    await model2.add('categories', getDocData({userId: docId}))

    assert.equal(query.get().length, 0)

    store.connectModel(model)
    store.connectModel(model2)
    await Promise.all([
      eventToPromise(model, 'online'),
      eventToPromise(model2, 'online')
    ])
    if (query.get().length !== 1) await eventToPromise(query, 'change')

    assert.equal(query.get().length, 1)
  })

  it('should apply ops offline when subscribed to query', async () => {
    let query = model.query(collectionName, joinExpression)
    await query.subscribe()
    model.close()
    await model.add(collectionName, getDocData())
    await model.add('categories', getDocData({userId: docId}))

    assert.equal(query.get().length, 1)

    store.connectModel(model)
    await eventToPromise(model, 'online')
    if (query.get().length !== 1) await eventToPromise(query, 'change')

    assert.equal(query.get().length, 1)
  })

  it('should sync on online when subscribed to query and add', async () => {
    let query = model.query(collectionName, joinExpression)
    await query.subscribe()
    let query2 = model2.query(collectionName, joinExpression)
    await query2.subscribe()
    model.close()
    model2.close()
    await model.add(collectionName, getDocData())
    await model2.add('categories', getDocData({userId: docId}))

    assert.equal(query.get().length, 0)
    assert.equal(query2.get().length, 0)

    store.connectModel(model)
    store.connectModel(model2)
    await Promise.all([
      eventToPromise(model, 'online'),
      eventToPromise(model2, 'online')
    ])
    if (query.get().length !== 1) await eventToPromise(query, 'change')
    if (query2.get().length !== 1) await eventToPromise(query2, 'change')

    assert.equal(query.get().length, 1)
    assert.equal(query2.get().length, 1)
  })

  it.skip('should sync on online when subscribed to query and set', async () => {
    let query = model.query(collectionName, joinExpression)
    await query.subscribe()
    let query2 = model2.query(collectionName, joinExpression)
    await query2.subscribe()
    model.close()
    model2.close()
    await model.add(collectionName, getDocData())
    await model2.add('categories', getDocData({userId: docId}))
    await model2.set([collectionName, docId, field], 'Vasya')

    assert.equal(query.get().length, 1)
    assert.equal(query2.get().length, 1)

    store.connectModel(model)
    store.connectModel(model2)
    await Promise.all([
      eventToPromise(model, 'online'),
      eventToPromise(model2, 'online')
    ])

    assert.equal(query.get().length, 1)
    assert.equal(query2.get().length, 1)
    assert.equal(model2.get(collectionName, docId, field), 'Vasya')
  })
})
