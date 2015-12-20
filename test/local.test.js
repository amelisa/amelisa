import assert from 'assert'
import { MemoryStorage, Store } from '../src'
import { localCollectionName, docId, expression, field, value, sleep } from './util'

let storage
let store
let model
let model2

describe('local', () => {
  beforeEach(async () => {
    storage = new MemoryStorage()
    await storage.init()
    store = new Store(storage)
    model = store.createModel()
    model.source = 'model1'
    model2 = store.createModel()
    model2.source = 'model2'
  })

  it('should not send ops for local doc', async () => {
    let subscribes = [[localCollectionName, docId]]

    await model.subscribe(subscribes)

    let doc = {
      _id: docId,
      [field]: value
    }

    model2.add(localCollectionName, doc)
    assert(model2.get(localCollectionName, docId))
    assert.equal(model2.get(localCollectionName, docId, field), value)

    await sleep(10)

    assert(!model.get(localCollectionName, docId))
  })

  it('should not send ops for local query', async () => {
    let subscribes = [[localCollectionName, expression]]

    await model.subscribe(subscribes)

    let doc = {
      _id: docId,
      [field]: value
    }

    model2.add(localCollectionName, doc)
    let docs = model2.getQuery(localCollectionName, expression)
    assert.equal(docs.length, 1)
    assert.equal(docs[0]._id, docId)

    await sleep(10)

    assert.equal(model.getQuery(localCollectionName, expression).length, 0)
  })
})
