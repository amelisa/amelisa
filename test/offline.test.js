import assert from 'assert'
import { MemoryStorage, Store } from '../src'
import { collectionName, docId, expression, countExpression, field, value, sleep } from './util'
import ServerChannel from '../src/ServerChannel'

let storage
let store
let model
let model2

describe('offline', () => {
  beforeEach(async () => {
    storage = new MemoryStorage()
    await storage.init()

    store = new Store(storage)
    model = store.createModel()
    model.source = 'model1'
    model2 = store.createModel()
    model2.source = 'model2'
  })

  it('should send ops on online when subscribed to doc', async () => {
    let subscribes = [[collectionName, docId]]
    await model.subscribe(subscribes)

    model2.close()

    let doc = {
      _id: docId,
      [field]: value
    }
    model2.add(collectionName, doc)

    await sleep(10)

    assert.equal(model.get(collectionName, docId), undefined)
    store.connectModel(model2)

    await sleep(10)

    assert(model.get(collectionName, docId))
  })

  it('should send ops on online when subscribed to query', async () => {
    let subscribes = [[collectionName, expression]]
    await model.subscribe(subscribes)

    model2.close()

    let doc = {
      _id: docId,
      [field]: value
    }
    model2.add(collectionName, doc)

    await sleep(10)

    assert.equal(model.get(collectionName, docId), undefined)

    store.connectModel(model2)

    await sleep(10)

    assert(model.get(collectionName, docId))
  })

  it('should receive ops on online when subscribed to doc', async () => {
    let subscribes = [[collectionName, docId]]
    await model.subscribe(subscribes)

    model.close()

    let doc = {
      _id: docId,
      [field]: value
    }
    model2.add(collectionName, doc)

    await sleep(10)

    assert(!model.get(collectionName, docId))

    store.connectModel(model)

    await sleep(10)

    assert(model.get(collectionName, docId))
  })

  it('should receive ops on online when subscribed to query', async () => {
    let subscribes = [[collectionName, expression]]
    await model.subscribe(subscribes)

    model.close()

    let doc = {
      _id: docId,
      [field]: value
    }
    model2.add(collectionName, doc)

    await sleep(10)

    assert.equal(model.query(collectionName, expression).get().length, 0)

    store.connectModel(model)

    await sleep(10)

    assert.equal(model.query(collectionName, expression).get().length, 1)
  })

  it('should receive ops on online when subscribed to count query', async () => {
    let subscribes = [[collectionName, countExpression]]
    await model.subscribe(subscribes)

    model.close()

    let doc = {
      _id: docId,
      [field]: value
    }
    model2.add(collectionName, doc)

    await sleep(10)

    assert.equal(model.query(collectionName, countExpression).get(), 0)

    store.connectModel(model)

    await sleep(10)

    assert.equal(model.query(collectionName, countExpression).get(), 1)
  })

  it('should send and receive ops on online when subscribed to doc', async () => {
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

  it('should send and receive ops on online when subscribed to query', async () => {
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

  it('should send and receive ops on online when subscribed to count query', async () => {
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

  it('should apply ops offline when subscribed to query', async () => {
    let subscribes = [[collectionName, expression]]
    await model.subscribe(subscribes)

    model.close()

    let doc = {
      _id: docId,
      [field]: value
    }
    model.add(collectionName, doc)

    await sleep(10)

    let query = model.query(collectionName, expression)
    assert(model.get(collectionName, docId))
    assert.equal(query.get().length, 1)
  })

  it('should apply ops offline when subscribed to count query', async () => {
    let subscribes = [[collectionName, countExpression]]
    await model.subscribe(subscribes)

    model.close()

    let doc = {
      _id: docId,
      [field]: value
    }
    model.add(collectionName, doc)

    await sleep(10)

    let query = model.query(collectionName, countExpression)
    assert(model.get(collectionName, docId))
    assert.equal(query.get(), 1)
  })

  it('should sync on online when subscribed to query and add', async () => {
    let subscribes = [[collectionName, expression]]
    await model.subscribe(subscribes)
    await model2.subscribe(subscribes)

    model.close()
    model2.close()

    let doc = {
      _id: '1',
      [field]: value
    }
    let doc2 = {
      _id: '2',
      [field]: value
    }
    model.add(collectionName, doc)
    model2.add(collectionName, doc2)

    await sleep(10)

    assert.equal(model.query(collectionName, expression).get().length, 1)
    assert.equal(model2.query(collectionName, expression).get().length, 1)

    store.connectModel(model2)
    store.connectModel(model)

    await sleep(10)

    assert.equal(model.query(collectionName, expression).get().length, 2)
    assert.equal(model2.query(collectionName, expression).get().length, 2)
  })

  it('should sync on online when subscribed to query and set', async () => {
    let subscribes = [[collectionName, expression]]
    await model.subscribe(subscribes)
    await model2.subscribe(subscribes)

    model.close()
    model2.close()

    let doc = {
      _id: docId,
      [field]: value
    }
    let doc2 = {
      _id: '2',
      [field]: value
    }
    model.add(collectionName, doc)
    model2.add(collectionName, doc2)
    model2.set([collectionName, docId, field], 'Vasya')

    await sleep(10)

    assert.equal(model.query(collectionName, expression).get().length, 1)
    assert.equal(model2.query(collectionName, expression).get().length, 2)

    store.connectModel(model2)
    store.connectModel(model)

    await sleep(10)

    assert.equal(model.query(collectionName, expression).get().length, 2)
    assert.equal(model2.query(collectionName, expression).get().length, 2)
    assert.equal(model2.get(collectionName, docId, field), 'Vasya')
  })

  it('should sync on online when subscribed to query and del', async () => {
    let subscribes = [[collectionName, expression]]
    await model.subscribe(subscribes)
    await model2.subscribe(subscribes)

    model.close()
    model2.close()

    let doc = {
      _id: docId,
      [field]: value
    }
    let doc2 = {
      _id: '2',
      [field]: value
    }
    model.add(collectionName, doc)
    model2.add(collectionName, doc2)
    model.del([collectionName, '2'])
    model2.del([collectionName, docId])

    await sleep(10)

    assert.equal(model.query(collectionName, expression).get().length, 1)
    assert.equal(model2.query(collectionName, expression).get().length, 1)

    store.connectModel(model2)
    store.connectModel(model)

    await sleep(10)

    assert.equal(model.query(collectionName, expression).get().length, 0)
    assert.equal(model2.query(collectionName, expression).get().length, 0)
  })

  it('should sync on online when subscribed to query and there are some ops', async () => {
    let subscribes = [[collectionName, expression]]
    await model.subscribe(subscribes)
    await model2.subscribe(subscribes)

    let doc = {
      _id: docId,
      [field]: value
    }
    let doc2 = {
      _id: '2',
      [field]: value
    }
    let doc3 = {
      _id: '3',
      [field]: value
    }
    let doc4 = {
      _id: '4',
      [field]: value
    }
    model.add(collectionName, doc)
    model2.add(collectionName, doc2)
    model2.add(collectionName, doc3)

    await sleep(10)

    model.close()
    model2.close()

    await sleep(10)

    assert.equal(model.query(collectionName, expression).get().length, 3)
    assert.equal(model2.query(collectionName, expression).get().length, 3)

    model2.add(collectionName, doc4)
    model.del([collectionName, docId])
    model.set([collectionName, '2', field], 'Vasya')

    store.connectModel(model2)
    store.connectModel(model)

    await sleep(10)

    assert.equal(model.query(collectionName, expression).get().length, 3)
    assert.equal(model2.query(collectionName, expression).get().length, 3)
    assert.equal(model2.get(collectionName, '2', field), 'Vasya')

    await sleep(10)

    model.close()
    model2.close()

    await sleep(10)

    model2.set([collectionName, '3', field], 'Vasya')

    await sleep(10)

    assert.equal(model.query(collectionName, expression).get().length, 3)
    assert.equal(model2.query(collectionName, expression).get().length, 3)
    assert.equal(model2.get(collectionName, '2', field), 'Vasya')
    assert.equal(model2.get(collectionName, '3', field), 'Vasya')
  })

  it.only('should sync on online when subscribed to query and there are some ops 2', async () => {
    let subscribes = [[collectionName, expression]]
    await model.subscribe(subscribes)
    await model2.subscribe(subscribes)

    let doc = {
      _id: docId,
      [field]: value
    }
    let doc2 = {
      _id: '2',
      [field]: value
    }
    let doc3 = {
      _id: '3',
      [field]: value
    }
    let doc4 = {
      _id: '4',
      [field]: value
    }
    model2.add(collectionName, doc)
    model.add(collectionName, doc2)
    model2.add(collectionName, doc3)

    await sleep(10)

    model2.close()
    model.close()

    await sleep(10)

    assert.equal(model.query(collectionName, expression).get().length, 3)
    assert.equal(model2.query(collectionName, expression).get().length, 3)

    model.add(collectionName, doc4)
    model2.del([collectionName, docId])
    model2.set([collectionName, '2', field], 'Petr')
    model2.set([collectionName, '2', field], 'Vasya')

    assert.equal(model.query(collectionName, expression).get().length, 4)
    assert.equal(model2.query(collectionName, expression).get().length, 2)

    store.connectModel(model)
    store.connectModel(model2)

    await sleep(10)

    assert.equal(model.query(collectionName, expression).get().length, 3)
    assert.equal(model2.query(collectionName, expression).get().length, 3)
    assert.equal(model.get(collectionName, '2', field), 'Vasya')

    model.close()
    model2.close()

    await sleep(10)

    model2.set([collectionName, '3', field], 'Vasya')

    await sleep(10)

    assert.equal(model.query(collectionName, expression).get().length, 3)
    assert.equal(model2.query(collectionName, expression).get().length, 3)
    assert.equal(model2.get(collectionName, '2', field), 'Vasya')
    assert.equal(model2.get(collectionName, '3', field), 'Vasya')
  })
})
