import assert from 'assert'
import eventToPromise from 'event-to-promise'
import { MemoryStorage, Store } from '../src'
import { collectionName, dbCollectionName, docId, expression, countExpression, joinExpression, field, value, sleep } from './util'
import ServerChannel from '../src/ServerChannel'

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
  }
}

describe('projections', () => {
  beforeEach(async () => {
    storage = new MemoryStorage()
    await storage.init()

    store = new Store(storage, null, null, options)
    model = store.createModel()
    model.source = 'model1'
    model2 = store.createModel()
    model2.source = 'model2'
  })

  it('should subscribe to projected doc', async () => {
    let subscribes = [[collectionName, docId]]
    let subscription = await model.subscribe(subscribes)

    let data = subscription.get()
    let doc = data[0]
    assert(!doc)

    let docData = {
      _id: docId,
      [field]: value,
      age: 14
    }

    model2.add(dbCollectionName, docData)

    await eventToPromise(subscription, 'change')

    assert(model.get(collectionName, docId, field))
    assert(!model.get(collectionName, docId, 'age'))
  })

  it('should subscribe to projected query', async () => {
    let subscribes = [[collectionName, expression]]
    let subscription = await model.subscribe(subscribes)

    let data = subscription.get()
    let query = data[0]
    assert(!query.length)

    let doc = {
      _id: docId,
      [field]: value,
      age: 14
    }

    model2.add(dbCollectionName, doc)

    await eventToPromise(subscription, 'change')

    let docs = model.query(collectionName, expression).get()
    assert.equal(docs.length, 1)
    assert.equal(docs[0][field], value)
    assert.equal(docs[0].age, undefined)
  })

  it('should subscribe to projected join query', async () => {
    let subscribes = [[collectionName, joinExpression]]
    let subscription = await model.subscribe(subscribes)

    let data = subscription.get()
    let query = data[0]
    assert(!query.length)

    let doc = {
      _id: docId,
      [field]: value,
      age: 14
    }

    let category = {
      _id: '1',
      userId: docId
    }

    model2.add(dbCollectionName, doc)
    model2.add('categories', category)

    await eventToPromise(subscription, 'change')

    let docs = model.query(collectionName, joinExpression).get()
    assert.equal(docs.length, 1)
    assert.equal(docs[0][field], value)
    assert.equal(docs[0].age, undefined)
  })

  it('should add projected doc to projected collection', async () => {
    let doc = {
      _id: docId,
      [field]: value
    }

    await model.add(collectionName, doc)
  })

  it('should add projected doc with complex field to projected collection', async () => {
    let doc = {
      _id: docId,
      complex: {
        name: 1
      }
    }

    await model.add(collectionName, doc)
  })

  it('should not add not projected doc to projected collection', async () => {
    let doc = {
      _id: docId,
      [field]: value,
      age: 14
    }

    await model
      .add(collectionName, doc)
      .catch((err) => {
        assert(err)
      })
  })

  it('should set on projected field in projected collection', async () => {
    let doc = {
      _id: docId,
      [field]: value
    }

    await model.add(collectionName, doc)
    await model.set([collectionName, docId, field], 'Vasya')
    assert.equal(model.get(collectionName, docId, field), 'Vasya')
  })

  it('should set on projected complex field in projected collection', async () => {
    let doc = {
      _id: docId,
      complex: {
        name: 1
      }
    }

    await model.add(collectionName, doc)
    await model.set([collectionName, docId, 'complex'], {name: 2})
    assert.equal(model.get(collectionName, docId, 'complex.name'), 2)
  })

  it('should set on projected complex child field in projected collection', async () => {
    let doc = {
      _id: docId,
      complex: {
        name: 1
      }
    }

    await model.add(collectionName, doc)
    await model.set([collectionName, docId, 'complex.name'], 2)
    assert.equal(model.get(collectionName, docId, 'complex.name'), 2)
  })

  it('should not set on not projected field in projected collection', async () => {
    let doc = {
      _id: docId,
      [field]: value
    }

    await model.add(collectionName, doc)
    await model.set([collectionName, docId, 'age'], 15)
      .catch((err) => {
        assert(err)
      })
  })

  it('should del doc in projected collection', async () => {
    let doc = {
      _id: docId,
      [field]: value
    }

    await model.add(collectionName, doc)
    await model.del([collectionName, docId])
  })

  it('should del on projected field in projected collection', async () => {
    let doc = {
      _id: docId,
      [field]: value
    }

    await model.add(collectionName, doc)
    await model.del([collectionName, docId, field])
    assert.equal(model.get(collectionName, docId, field), undefined)
  })

  it('should del on projected complext field in projected collection', async () => {
    let doc = {
      _id: docId,
      complex: {
        name: 1
      }
    }

    await model.add(collectionName, doc)
    await model.del([collectionName, docId, 'complex'])
    assert.equal(model.get(collectionName, docId, 'complex'), undefined)
  })

  it('should del on projected complext child field in projected collection', async () => {
    let doc = {
      _id: docId,
      complex: {
        name: 2
      }
    }

    await model.add(collectionName, doc)
    await model.del([collectionName, docId, 'complex.name'])
    assert.equal(model.get(collectionName, docId, 'complex.name'), undefined)
  })

  it('should send and receive ops on online when subscribed to projected doc', async () => {
    let subscribes = [[collectionName, docId]]
    await model.subscribe(subscribes)

    model.close()
    model2.close()

    let doc = {
      _id: docId,
      [field]: value
    }
    model2.add(collectionName, doc)

    await sleep(10)

    assert(!model.get(collectionName, docId))

    store.connectModel(model)
    store.connectModel(model2)

    await sleep(10)

    assert(model.get(collectionName, docId))
  })

  it('should send and receive ops on online when subscribed to projected query', async () => {
    let subscribes = [[collectionName, expression]]
    await model.subscribe(subscribes)

    model.close()
    model2.close()

    let doc = {
      _id: docId,
      [field]: value
    }
    model2.add(collectionName, doc)

    await sleep(10)

    assert.equal(model.query(collectionName, expression).get().length, 0)

    store.connectModel(model2)

    await sleep(10)

    assert.equal(model.query(collectionName, expression).get().length, 0)

    store.connectModel(model)

    await sleep(10)

    assert.equal(model.query(collectionName, expression).get().length, 1)
  })

  it('should send and receive ops on online when subscribed to projected count query', async () => {
    let subscribes = [[collectionName, countExpression]]
    await model.subscribe(subscribes)

    model.close()
    model2.close()

    let doc = {
      _id: docId,
      [field]: value
    }
    model2.add(collectionName, doc)

    await sleep(10)

    assert.equal(model.query(collectionName, countExpression).get(), 0)

    store.connectModel(model2)

    await sleep(10)

    assert.equal(model.query(collectionName, countExpression).get(), 0)

    store.connectModel(model)

    await sleep(10)

    assert.equal(model.query(collectionName, countExpression).get(), 1)
  })
})
