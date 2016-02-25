import assert from 'assert'
import eventToPromise from 'event-to-promise'
import { MemoryStorage, Store } from '../src'
import { collectionName, docId, expression, joinExpression, field, value, sleep } from './util'

let storage
let store
let model
let model2

describe('multymodel', () => {
  beforeEach(async () => {
    storage = new MemoryStorage()
    await storage.init()

    store = new Store(storage)
    model = store.createModel()
    model.source = 'model1'
    model2 = store.createModel()
    model2.source = 'model2'
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

  // FIXME: fails sometimes
  it.skip('should subscribe query, and get doc changes', async () => {
    let subscribes = [[collectionName, expression]]
    let value2 = 'value2'

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

    model2.set([collectionName, docId, field], value2)

    await eventToPromise(subscription, 'change')

    assert.equal(model.get(collectionName, docId, field), value2)
  })

  it('should subscribe query two times', async () => {
    let value2 = 'value2'

    let doc = {
      [field]: value
    }

    let doc2 = {
      name: value2
    }

    await Promise.all([
      model2.add(collectionName, doc),
      model2.add(collectionName, doc2)
    ])

    let query1 = model.query(collectionName, {[field]: value})
    await model.subscribe(query1)
    assert.equal(query1.get().length, 1)

    let query2 = model.query(collectionName, {[field]: value2})
    await model.subscribe(query2)

    assert.equal(query2.get().length, 1)
  })

  it('should subscribe join query and get it', async () => {
    let subscribes = [[collectionName, joinExpression]]

    let subscription = await model.subscribe(subscribes)
    let data = subscription.get()
    let query = data[0]
    assert.equal(query.length, 0)

    let doc = {
      _id: docId,
      [field]: value
    }

    let category = {
      _id: '1',
      userId: docId
    }

    model2.add(collectionName, doc)
    model2.add('categories', category)

    await eventToPromise(subscription, 'change')

    data = subscription.get()
    query = data[0]
    assert.equal(query.length, 1)

    model2.set(['categories', '1', 'userId'], '2')

    await eventToPromise(subscription, 'change')

    data = subscription.get()
    query = data[0]
    assert.equal(query.length, 0)

    let user2 = {
      _id: '2',
      [field]: value
    }
    model2.add(collectionName, user2)

    await eventToPromise(subscription, 'change')

    data = subscription.get()
    query = data[0]
    assert.equal(query.length, 1)
  })

  it('should do several operations synchronously', async () => {
    let doc = {
      _id: docId,
      [field]: value
    }
    model.add(collectionName, doc)
    model.set([collectionName, docId, field], 'Petr')
    model.set([collectionName, docId, field], 'Vasya')
    model.set([collectionName, docId, 'age'], 20)

    await sleep(20)

    let $user = model2.doc(collectionName, docId)
    await $user.fetch()

    let user = $user.get()
    assert(user)
    assert.equal(user[field], 'Vasya')
    assert.equal(user.age, 20)
  })

  it('should emit only one change event', async (done) => {
    let doc = {
      _id: docId,
      [field]: value
    }
    model.add(collectionName, doc)
    model.set([collectionName, docId, field], 'Petr')
    model.set([collectionName, docId, field], 'Vasya')
    model.set([collectionName, docId, 'age'], 20)

    await sleep(20)

    let $user = model2.doc(collectionName, docId)

    $user.on('change', done)

    $user.subscribe()
  })
})
