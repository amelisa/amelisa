import assert from 'assert'
import { MemoryStorage, Store } from '../src/server'
import { collectionName, docId, expression, countExpression, field, value, sleep } from './util'

let storage
let store
let model
let model2

describe('offline', () => {
  beforeEach(async () => {
    storage = new MemoryStorage()
    await storage.init()

    store = new Store(storage)
    model = store.createModel({isClient: true})
    model.source = 'model1'
    model2 = store.createModel({isClient: true})
    model2.source = 'model2'
    await model.onReady()
    await model2.onReady()
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
    await sleep(10)
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

    await sleep(10)

    model.del([collectionName, '2'])
    model2.del([collectionName, docId])

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

  it('should sync on online when subscribed to query and there are some ops 2', async () => {
    let model3 = store.createModel()
    let expression2 = {$skip: 1, $limit: 2, $orderby: {name: -1}}

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
    let doc5 = {
      _id: '5',
      [field]: value
    }
    model3.add(collectionName, doc)
    model3.add(collectionName, doc2)
    model3.add(collectionName, doc3)

    let subscribes = [[collectionName, expression2]]
    await model.subscribe(subscribes)
    await model2.subscribe(subscribes)

    model2.close()
    model.close()

    model.add(collectionName, doc4)
    model2.add(collectionName, doc5)
    model.del([collectionName, docId])
    model2.del([collectionName, '3'])
    model.set([collectionName, '2', field], 'Petr')
    model2.set([collectionName, '2', field], 'Vasya')

    store.connectModel(model)
    store.connectModel(model2)

    await sleep(10)

    let query = model.query(collectionName, expression2).get()
    let query2 = model2.query(collectionName, expression2).get()
    assert.equal(query.length, 2)
    assert.equal(query2.length, 2)
    assert.equal(JSON.stringify(query), JSON.stringify(query2))
  })

  it('should sync on online when subscribed to count query and there are some ops', async () => {
    let model3 = store.createModel()
    let expression2 = {$count: true}

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
    let doc5 = {
      _id: '5',
      [field]: value
    }
    model3.add(collectionName, doc)
    model3.add(collectionName, doc2)
    model3.add(collectionName, doc3)

    let subscribes = [[collectionName, expression2]]
    await model.subscribe(subscribes)
    await model2.subscribe(subscribes)

    model2.close()
    model.close()

    model.add(collectionName, doc4)
    model2.add(collectionName, doc5)

    await sleep(10)

    model.del([collectionName, docId])
    model2.del([collectionName, '3'])
    model.set([collectionName, '2', field], 'Petr')
    model2.set([collectionName, '2', field], 'Vasya')

    store.connectModel(model)
    store.connectModel(model2)

    await sleep(10)

    assert.equal(model.query(collectionName, expression2).get(), 3)
    assert.equal(model2.query(collectionName, expression2).get(), 3)
  })
})
