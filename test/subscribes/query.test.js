import assert from 'assert'
import eventToPromise from 'event-to-promise'
import { Store } from '../../src/server'
import { getStorage, collectionName, docId, expression, field, value, value2, getDocData, sleep } from '../util'

let storage
let store
let model
let model2

describe('subscribes query', () => {
  beforeEach(async () => {
    storage = await getStorage()
    store = new Store({storage, saveDebounceTimeout: 0})
    await store.init()
    model = store.createModel()
    model2 = store.createModel()
  })

  it('should fetch empty query if no docs', async () => {
    let query = model.query(collectionName, expression)
    await query.fetch()

    assert.equal(query.get().length, 0)
  })

  it('should fetch query', async () => {
    let query = model.query(collectionName, expression)
    await model2.add(collectionName, getDocData())
    await query.fetch()

    assert.equal(query.get().length, 1)
    assert.equal(query.get()[0][field], value)
  })

  it('should fetch query two times', async () => {
    let query = model.query(collectionName, expression)
    await model2.add(collectionName, getDocData())
    await query.fetch()
    await query.fetch()

    assert.equal(query.get().length, 1)
    assert.equal(query.get()[0][field], value)
  })

  it('should fetch query with operations', async () => {
    let query = model.query(collectionName, expression)
    await model2.add(collectionName, getDocData())
    await model2.set([collectionName, docId, field], value2)
    await query.fetch()

    assert.equal(query.get().length, 1)
    assert.equal(query.get()[0][field], value2)
  })

  it('should fetch empty query if doc was deleted', async () => {
    let query = model.query(collectionName, expression)
    await model2.add(collectionName, getDocData())
    await query.fetch()
    await model2.del(collectionName, docId)
    await query.fetch()

    assert.equal(query.get().length, 0)
  })

  it('should fetch query while docs are added at same model', async () => {
    let query = model.query(collectionName, expression)
    await model.add(collectionName, getDocData())
    model.add(collectionName, getDocData({id: '2'}))
    query.fetch()
    model.add(collectionName, getDocData({id: '3'}))
    await eventToPromise(query, 'change')

    assert.equal(query.get().length, 1)
  })

  it('should fetchAndGet query', async () => {
    let query = model.query(collectionName, expression)
    await model2.add(collectionName, getDocData())
    let queryData = await query.fetchAndGet()

    assert(queryData)
    assert.deepEqual(queryData, [getDocData()])
  })

  it('should subscribe empty query if not docs', async () => {
    let query = model.query(collectionName, expression)
    await query.subscribe()

    assert.equal(query.get().length, 0)
  })

  it('should subscribe query', async () => {
    let query = model.query(collectionName, expression)
    await model2.add(collectionName, getDocData())
    await query.subscribe()

    assert.equal(query.get().length, 1)
    assert.equal(query.get()[0][field], value)
  })

  it('should subscribe query two times', async () => {
    let query = model.query(collectionName, expression)
    await model2.add(collectionName, getDocData())
    await query.subscribe()
    await query.subscribe()

    assert.equal(query.get().length, 1)
    assert.equal(query.get()[0][field], value)
  })

  it('should subscribe query without fetch', async () => {
    let query = model.query(collectionName, expression)
    await model2.add(collectionName, getDocData())
    await query.subscribe({fetch: false})

    assert.equal(query.get().length, 0)

    await eventToPromise(query, 'change')

    assert.equal(query.get().length, 1)
    assert.equal(query.get()[0][field], value)
  })

  it('should subscribe query if in same model', async () => {
    let query = model.query(collectionName, expression)
    await model.add(collectionName, getDocData())
    await query.subscribe()

    assert.equal(query.get().length, 1)
    assert.equal(query.get()[0][field], value)
  })

  it('should subscribe query and get doc as it was added', async () => {
    let query = model.query(collectionName, expression)
    await query.subscribe()
    setTimeout(() => model2.add(collectionName, getDocData()))
    await eventToPromise(query, 'change')

    assert.equal(query.get().length, 1)
    assert.equal(query.get()[0][field], value)
  })

  it('should subscribe query and get doc as it was added in same model', async () => {
    let query = model.query(collectionName, expression)
    await query.subscribe()
    model.add(collectionName, getDocData())
    await sleep(20)

    assert.equal(query.get().length, 1)
    assert.equal(query.get()[0][field], value)
  })

  it('should subscribe query and changes it as doc was changed', async () => {
    let query = model.query(collectionName, expression)
    await model2.add(collectionName, getDocData())
    await query.subscribe()
    setTimeout(() => model2.set([collectionName, docId, field], value2))
    await eventToPromise(query, 'change')

    assert.equal(query.get().length, 1)
    assert.equal(query.get()[0][field], value2)
  })

  it('should subscribe query and changes it as doc was changed in same model', async () => {
    let query = model.query(collectionName, expression)
    await model.add(collectionName, getDocData())
    await query.subscribe()
    await model.set([collectionName, docId, field], value2)
    await sleep(20)

    assert.equal(query.get().length, 1)
    assert.equal(query.get()[0][field], value2)
  })

  it('should subscribe query and empty it as doc was deleted', async () => {
    let query = model.query(collectionName, expression)
    await model2.add(collectionName, getDocData())
    await query.subscribe()
    setTimeout(() => model2.del(collectionName, docId))
    await eventToPromise(query, 'change')

    assert.equal(query.get().length, 0)
  })

  it('should subscribe query while docs are added at same model', async () => {
    let query = model.query(collectionName, expression)
    await model.add(collectionName, getDocData())
    model.add(collectionName, getDocData({id: '2'}))
    query.subscribe()
    model.add(collectionName, getDocData({id: '3'}))
    await sleep(20)

    assert.equal(query.get().length, 3)
  })

  it('should subscribe query and empty it as doc was deleted in same model', async () => {
    let query = model.query(collectionName, expression)
    await model.add(collectionName, getDocData())
    await query.subscribe()
    await model.del(collectionName, docId)

    assert.equal(query.get().length, 0)
  })

  it('should subscribe two different queries', async () => {
    let query = model.query(collectionName, expression)
    let query2 = model.query(collectionName, {id: docId})
    await model2.add(collectionName, getDocData())
    await model2.add(collectionName, getDocData({id: '2'}))
    await model.subscribe(query, query2)

    assert.equal(query.get().length, 2)
    assert.equal(query2.get().length, 1)
  })

  it('should emit only one change when subscribed and on query with some ops', async (done) => {
    let query = model.query(collectionName, expression)
    await model2.add(collectionName, getDocData())
    await model2.set([collectionName, docId, field], 'Petr')
    await model2.set([collectionName, docId, field], 'Vasya')
    await model2.set([collectionName, docId, 'age'], 20)

    query.subscribe()

    query.on('change', done)
  })
})
