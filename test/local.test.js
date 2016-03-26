import assert from 'assert'
import { MemoryStorage } from '../src/mongo'
import { Store } from '../src/server'
import { localCollectionName, docId, expression, getDocData, sleep } from './util'

let storage
let store
let model
let model2

describe('local', () => {
  beforeEach(async () => {
    storage = new MemoryStorage()
    store = new Store(storage)
    await store.init()
    model = store.createModel()
    model2 = store.createModel()
  })

  it('should not send ops for local doc', async () => {
    let doc = model.doc(localCollectionName, docId)
    await doc.subscribe()
    await model2.add(localCollectionName, getDocData())
    await sleep(10)

    assert(!doc.get())
  })

  it('should not send ops for local query', async () => {
    let query = model.query(localCollectionName, expression)
    await query.subscribe()
    await model2.add(localCollectionName, getDocData())
    await sleep(10)

    assert.equal(query.get().length, 0)
  })
})
