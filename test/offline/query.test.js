import assert from 'assert'
import eventToPromise from 'event-to-promise'
import { MemoryStorage } from '../../src/mongo'
import { Store } from '../../src/server'
import { collectionName, docId, expression, field, getDocData, sleep } from '../util'

let storage
let store
let model
let model2

describe('offline query', () => {
  beforeEach(async () => {
    storage = new MemoryStorage()
    store = new Store(storage, null, {saveDebounceTimeout: 0})
    await store.init()
    model = store.createModel({isClient: true})
    model.source = 'model1'
    model2 = store.createModel({isClient: true})
    model2.source = 'model2'
    await model.onReady()
    await model2.onReady()
  })

  it('should send ops on online when subscribed to query', async () => {
    let query = model.query(collectionName, expression)
    await query.subscribe()
    model2.close()

    await model2.add(collectionName, getDocData())

    assert.equal(query.get().length, 0)

    store.connectModel(model2)
    await eventToPromise(query, 'change')

    assert.equal(query.get().length, 1)
  })

  it('should receive ops on online when subscribed to query', async () => {
    let query = model.query(collectionName, expression)
    await query.subscribe()
    model.close()
    await model2.add(collectionName, getDocData())

    assert.equal(query.get().length, 0)

    store.connectModel(model)
    await eventToPromise(query, 'change')

    assert.equal(query.get().length, 1)
  })

  it('should send and receive ops on online when subscribed to query', async () => {
    let query = model.query(collectionName, expression)
    await query.subscribe()
    model.close()
    model2.close()
    await model2.add(collectionName, getDocData())

    assert.equal(query.get().length, 0)

    store.connectModel(model)
    store.connectModel(model2)
    await sleep(20)

    assert.equal(query.get().length, 1)
  })

  it('should apply ops offline when subscribed to query', async () => {
    let query = model.query(collectionName, expression)
    await query.subscribe()
    model.close()
    await model.add(collectionName, getDocData())

    assert.equal(query.get().length, 1)

    store.connectModel(model)
    await sleep(20)

    assert.equal(query.get().length, 1)
  })

  it('should sync on online when subscribed to query and add', async () => {
    let query = model.query(collectionName, expression)
    await query.subscribe()
    let query2 = model2.query(collectionName, expression)
    await query2.subscribe()
    model.close()
    model2.close()
    await model.add(collectionName, getDocData())
    await model2.add(collectionName, getDocData({_id: '2'}))

    assert.equal(query.get().length, 1)
    assert.equal(query2.get().length, 1)

    store.connectModel(model)
    store.connectModel(model2)
    await sleep(20)

    assert.equal(query.get().length, 2)
    assert.equal(query2.get().length, 2)
  })

  it('should sync on online when subscribed to query and set', async () => {
    let query = model.query(collectionName, expression)
    await query.subscribe()
    let query2 = model2.query(collectionName, expression)
    await query2.subscribe()
    model.close()
    model2.close()
    await model.add(collectionName, getDocData())
    await model2.add(collectionName, getDocData({_id: '2'}))
    await sleep(10)
    await model2.set([collectionName, docId, field], 'Vasya')

    assert.equal(query.get().length, 1)
    assert.equal(query2.get().length, 2)

    store.connectModel(model)
    store.connectModel(model2)
    await sleep(20)

    assert.equal(query.get().length, 2)
    assert.equal(query2.get().length, 2)
    assert.equal(model2.get(collectionName, docId, field), 'Vasya')
  })

  it('should sync on online when subscribed to query and del', async () => {
    let query = model.query(collectionName, expression)
    await query.subscribe()
    let query2 = model2.query(collectionName, expression)
    await query2.subscribe()
    model.close()
    model2.close()
    await model.add(collectionName, getDocData())
    await model2.add(collectionName, getDocData({_id: '2'}))
    await sleep(10)
    await model.del(collectionName, '2')
    await model2.del(collectionName, docId)

    assert.equal(query.get().length, 1)
    assert.equal(query2.get().length, 1)

    store.connectModel(model)
    store.connectModel(model2)
    await sleep(20)

    assert.equal(query.get().length, 0)
    assert.equal(query2.get().length, 0)
  })

  it('should sync on online when subscribed to query and there are some ops', async () => {
    let query = model.query(collectionName, expression)
    await query.subscribe()
    let query2 = model2.query(collectionName, expression)
    await query2.subscribe()
    await model.add(collectionName, getDocData())
    await model2.add(collectionName, getDocData({_id: '2'}))
    await model2.add(collectionName, getDocData({_id: '3'}))
    model.close()
    model2.close()

    assert.equal(query.get().length, 3)
    assert.equal(query2.get().length, 3)

    await model2.add(collectionName, getDocData({_id: '4'}))
    await model.del(collectionName, docId)
    await model.set([collectionName, '2', field], 'Vasya')

    store.connectModel(model2)
    store.connectModel(model)
    await sleep(20)

    assert.equal(query.get().length, 3)
    assert.equal(query2.get().length, 3)
    assert.equal(model2.get(collectionName, '2', field), 'Vasya')

    model.close()
    model2.close()
    await model2.set([collectionName, '3', field], 'Vasya')
    await sleep(10)

    assert.equal(query.get().length, 3)
    assert.equal(query2.get().length, 3)
    assert.equal(model2.get(collectionName, '2', field), 'Vasya')
    assert.equal(model2.get(collectionName, '3', field), 'Vasya')
  })

  it('should sync on online when subscribed to complex query and there are some ops', async () => {
    let model3 = store.createModel()
    let expression2 = {$skip: 1, $limit: 2, $orderby: {name: -1}}
    await model3.add(collectionName, getDocData())
    await model3.add(collectionName, getDocData({_id: '2'}))
    await model3.add(collectionName, getDocData({_id: '3'}))
    let query = model.query(collectionName, expression2)
    await query.subscribe()
    let query2 = model2.query(collectionName, expression2)
    await query2.subscribe()
    model.close()
    model2.close()
    await model.add(collectionName, getDocData({_id: '4'}))
    await model2.add(collectionName, getDocData({_id: '5'}))
    await model.del(collectionName, docId)
    await model2.del(collectionName, '3')
    await model.set([collectionName, '2', field], 'Petr')
    await model2.set([collectionName, '2', field], 'Vasya')
    store.connectModel(model)
    store.connectModel(model2)
    await sleep(20)

    assert.equal(query.get().length, 2)
    assert.equal(query2.get().length, 2)
    assert.equal(JSON.stringify(query.get()), JSON.stringify(query2.get()))
  })
})
