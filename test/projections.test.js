import assert from 'assert'
import eventToPromise from 'event-to-promise'
import { MemoryStorage } from '../src/mongo'
import { Store } from '../src/server'
import { collectionName, dbCollectionName, docId, expression, countExpression, joinExpression,
  field, field2, value, value2, getDocData, sleep } from './util'

let storage
let store
let model
let model2
let options = {
  projections: {
    [collectionName]: {
      collectionName: dbCollectionName,
      fields: {
        _id: true,
        [field]: true,
        complex: true
      }
    }
  },
  saveDebounceTimeout: 0
}

describe('projections', () => {
  beforeEach(async () => {
    storage = new MemoryStorage()
    store = new Store(storage, null, options)
    await store.init()
    model = store.createModel({isClient: true})
    model.source = 'model1'
    model2 = store.createModel({isClient: true})
    model2.source = 'model2'
    await model.onReady()
    await model2.onReady()
  })

  it('should fetch projected doc and get it', async () => {
    let doc = model.doc(collectionName, docId)
    await model2.add(dbCollectionName, getDocData({[field2]: value2}))
    await doc.fetch()

    assert(doc.get())
    assert.equal(doc.get(field), value)
    assert.equal(doc.get(field2), undefined)
  })

  it('should subscribe to projected doc and get it', async () => {
    let doc = model.doc(collectionName, docId)
    await doc.subscribe()
    setTimeout(() => model2.add(dbCollectionName, getDocData({[field2]: value2})))
    await eventToPromise(doc, 'change')

    assert(doc.get())
    assert.equal(doc.get(field), value)
    assert.equal(doc.get(field2), undefined)
  })

  it('should fetch projected query and get it', async () => {
    let query = model.query(collectionName, expression)
    await model2.add(dbCollectionName, getDocData({[field2]: value2}))
    await query.fetch()

    assert.equal(query.get().length, 1)
    assert.equal(query.get()[0][field], value)
    assert.equal(query.get()[0][field2], undefined)
  })

  it('should subscribe to projected query and get it', async () => {
    let query = model.query(collectionName, expression)
    await query.subscribe()
    setTimeout(() => model2.add(dbCollectionName, getDocData({[field2]: value2})))
    await eventToPromise(query, 'change')

    assert.equal(query.get().length, 1)
    assert.equal(query.get()[0][field], value)
    assert.equal(query.get()[0][field2], undefined)
  })

  it('should fetch projected count query and get it', async () => {
    let query = model.query(collectionName, countExpression)
    await model2.add(dbCollectionName, getDocData({[field2]: value2}))
    await query.fetch()

    assert.equal(query.get(), 1)
  })

  it('should subscribe to projected count query and get it', async () => {
    let query = model.query(collectionName, countExpression)
    await query.subscribe()
    setTimeout(() => model2.add(dbCollectionName, getDocData({[field2]: value2})))
    await eventToPromise(query, 'change')

    assert.equal(query.get(), 1)
  })

  it('should fetch projected join query and get it', async () => {
    let query = model.query(collectionName, joinExpression)
    await model2.add(dbCollectionName, getDocData({[field2]: value2}))
    await model2.add('categories', getDocData({userId: docId}))
    await query.fetch()

    assert.equal(query.get().length, 1)
    assert.equal(query.get()[0][field], value)
    assert.equal(query.get()[0][field2], undefined)
  })

  it('should subscribe to projected join query and get it', async () => {
    let query = model.query(collectionName, joinExpression)
    await query.subscribe()
    setTimeout(() => model2.add(dbCollectionName, getDocData({[field2]: value2})))
    setTimeout(() => model2.add('categories', getDocData({userId: docId})))
    await eventToPromise(query, 'change')

    assert.equal(query.get().length, 1)
    assert.equal(query.get()[0][field], value)
    assert.equal(query.get()[0][field2], undefined)
  })

  it('should add projected doc to projected collection', async () => {
    await model.add(collectionName, getDocData())
  })

  it('should add projected doc with complex field to projected collection', async () => {
    await model.add(collectionName, getDocData({complex: {name: 1}}))
  })

  it('should not add not projected doc to projected collection', async (done) => {
    await model
      .add(collectionName, getDocData({[field2]: value2}))
      .catch((err) => {
        assert(err)
        done()
      })
  })

  it('should set on projected field in projected collection', async () => {
    await model.add(collectionName, getDocData())
    await model.set([collectionName, docId, field], value2)
    assert.equal(model.get(collectionName, docId, field), value2)
  })

  it('should set on projected complex field in projected collection', async () => {
    await model.add(collectionName, getDocData({complex: {name: 1}}))
    await model.set([collectionName, docId, 'complex'], {name: 2})
    assert.equal(model.get(collectionName, docId, 'complex.name'), 2)
  })

  it('should set on projected complex child field in projected collection', async () => {
    await model.add(collectionName, getDocData({complex: {name: 1}}))
    await model.set([collectionName, docId, 'complex.name'], 2)
    assert.equal(model.get(collectionName, docId, 'complex.name'), 2)
  })

  it('should not set on not projected field in projected collection', async (done) => {
    await model.add(collectionName, getDocData())
    await model.set([collectionName, docId, field2], value2)
      .catch((err) => {
        assert(err)
        done()
      })
  })

  it('should del doc in projected collection', async () => {
    await model.add(collectionName, getDocData())
    await model.del(collectionName, docId)
  })

  it('should del on projected field in projected collection', async () => {
    await model.add(collectionName, getDocData())
    await model.del(collectionName, docId, field)
    assert.equal(model.get(collectionName, docId, field), undefined)
  })

  it('should del on projected complext field in projected collection', async () => {
    await model.add(collectionName, getDocData({complex: {name: 1}}))
    await model.del(collectionName, docId, 'complex')
    assert.equal(model.get(collectionName, docId, 'complex'), undefined)
  })

  it('should del on projected complext child field in projected collection', async () => {
    await model.add(collectionName, getDocData({complex: {name: 1}}))
    await model.del(collectionName, docId, 'complex.name')
    assert.equal(model.get(collectionName, docId, 'complex.name'), undefined)
  })

  it('should send and receive ops on online when subscribed to projected doc', async () => {
    let doc = model.doc(collectionName, docId)
    await doc.subscribe()
    model.close()
    model2.close()
    await model2.add(collectionName, getDocData())
    store.connectModel(model)
    store.connectModel(model2)
    await sleep(20)

    assert(doc.get())
  })

  it('should send and receive ops on online when subscribed to projected query', async () => {
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

  it('should send and receive ops on online when subscribed to projected count query', async () => {
    let query = model.query(collectionName, countExpression)
    await query.subscribe()
    model.close()
    model2.close()
    await model2.add(collectionName, getDocData())

    assert.equal(query.get(), 0)

    store.connectModel(model)
    store.connectModel(model2)
    await sleep(20)

    assert.equal(query.get(), 1)
  })
})
