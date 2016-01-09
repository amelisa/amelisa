import assert from 'assert'
import eventToPromise from 'event-to-promise'
import { MemoryStorage, Store } from '../src'
import { collectionName, docId, expression, field, value } from './util'

let storage
let store
let model

describe('Subscription', () => {
  beforeEach(async () => {
    storage = new MemoryStorage()
    await storage.init()

    store = new Store(storage)
    model = store.createModel()
  })

  it('should subscribe empty doc', async () => {
    let subscribes = [[collectionName, docId]]

    let subscription = await model.subscribe(subscribes)

    let data = subscription.get()
    assert.equal(data.length, 1)
    assert.equal(data[0], undefined)
    assert.equal(model.get(collectionName, docId), undefined)
  })

  it('should subscribe doc', async () => {
    let subscribes = [[collectionName, docId]]
    let doc = {
      _id: docId,
      [field]: value
    }

    await model.add(collectionName, doc)
    let subscription = await model.subscribe(subscribes)

    let data = subscription.get()
    assert.equal(data.length, 1)
    let dbDoc = data[0]
    assert(dbDoc)
    assert.equal(dbDoc[field], value)

    assert.equal(model.get(collectionName, docId, field), value)
  })

  it('should subscribe add doc and ops', async () => {
    let subscribes = [[collectionName, docId]]

    let subscription = await model.subscribe(subscribes)

    let doc = {
      _id: docId,
      [field]: value
    }

    model.add(collectionName, doc)

    await eventToPromise(subscription, 'change')

    model.set([collectionName, docId, field], value)

    await eventToPromise(subscription, 'change')

    model.del([collectionName, docId, field])

    await eventToPromise(subscription, 'change')

    model.del([collectionName, docId])

    await eventToPromise(subscription, 'change')
  })

  it('should subscribe empty query', async () => {
    let subscribes = [[collectionName, expression]]

    let subscription = await model.subscribe(subscribes)

    let data = subscription.get()
    assert.equal(data.length, 1)
    let query = data[0]
    assert(query)
    assert.equal(query.length, 0)

    let docs = model.query(collectionName, expression).get()
    assert.equal(docs.length, 0)
  })

  it('should subscribe query', async () => {
    let subscribes = [[collectionName, expression]]
    let doc = {
      _id: docId,
      [field]: value
    }

    await model.add(collectionName, doc)
    let subscription = await model.subscribe(subscribes)

    let data = subscription.get()
    assert.equal(data.length, 1)
    let query = data[0]
    assert(query)
    assert.equal(query.length, 1)
    assert.equal(query[0][field], value)

    let docs = model.query(collectionName, expression).get()
    assert.equal(docs.length, 1)
    assert.equal(docs[0][field], value)
  })

  it('should subscribe query and ops', async () => {
    let subscribes = [[collectionName, expression]]

    let subscription = await model.subscribe(subscribes)

    let doc = {
      _id: docId,
      [field]: value
    }

    model.add(collectionName, doc)

    await eventToPromise(subscription, 'change')
  })

  it('should subscribe doc and query', async () => {
    let subscribes = [[collectionName, docId], [collectionName, expression]]
    let docData = {
      _id: docId,
      [field]: value
    }

    await model.add(collectionName, docData)
    let subscription = await model.subscribe(subscribes)

    let data = subscription.get()
    assert.equal(data.length, 2)
    let doc = data[0]
    let query = data[1]
    assert(doc)
    assert(query)
    assert.equal(doc[field], value)
    assert.equal(query.length, 1)
    assert.equal(query[0][field], value)

    assert.equal(model.get(collectionName, docId, field), value)

    let docs = model.query(collectionName, expression).get()
    assert.equal(docs.length, 1)
    assert.equal(docs[0][field], value)
  })

  it('should subscribe doc and query and ops', async () => {
    let subscribes = [[collectionName, docId], [collectionName, expression]]

    let subscription = await model.subscribe(subscribes)

    let doc = {
      _id: docId,
      [field]: value
    }

    model.add(collectionName, doc)

    await eventToPromise(subscription, 'change')
  })

  it('should fetch doc when no array', async () => {
    await model.fetch(collectionName, docId)
  })

  it('should fetch doc when path', async () => {
    await model.fetch(`${collectionName}.${docId}`)
  })

  it('should fetch doc when array', async () => {
    await model.fetch([collectionName, docId])
  })

  it('should fetch doc when array of arrays', async () => {
    await model.fetch([[collectionName, docId]])
  })

  it('should subscribe doc when no array', async () => {
    await model.subscribe(collectionName, docId)
  })

  it('should subscribe doc when path', async () => {
    await model.subscribe(`${collectionName}.${docId}`)
  })

  it('should subscribe doc when array', async () => {
    await model.subscribe([collectionName, docId])
  })

  it('should subscribe doc when array of arrays', async () => {
    await model.subscribe([[collectionName, docId]])
  })
})
