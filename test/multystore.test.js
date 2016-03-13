import assert from 'assert'
import eventToPromise from 'event-to-promise'
import { MemoryPubsub, MemoryStorage, Store } from '../src/server'
import { collectionName, docId, expression, field, value2, getDocData } from './util'

let storage
let store
let store2
let model
let model2

describe('multystore', () => {
  beforeEach(async () => {
    storage = new MemoryStorage()
    await storage.init()

    let pubsub = new MemoryPubsub()

    store = new Store(storage, pubsub, {source: 'store1', saveDebounceTimeout: 0})
    store2 = new Store(storage, pubsub, {source: 'store2', saveDebounceTimeout: 0})
    model = store.createModel()
    model2 = store2.createModel()
  })

  it('should subscribe doc and get it', async () => {
    let doc = model.doc(collectionName, docId)
    await doc.subscribe()
    setTimeout(() => model2.add(collectionName, getDocData()), 0)
    await eventToPromise(doc, 'change')

    assert(doc.get())
  })

  it('should subscribe doc and get it and send ops', async () => {
    let doc = model.doc(collectionName, docId)
    await doc.subscribe()
    let doc2 = model2.doc(collectionName, docId)
    await doc2.subscribe()
    setTimeout(() => model2.add(collectionName, getDocData()), 0)
    await eventToPromise(doc, 'change')
    setTimeout(() => model2.set([collectionName, docId, field], value2), 0)
    await eventToPromise(doc, 'change')
    setTimeout(() => model.set([collectionName, docId, field], value2), 0)
    await eventToPromise(doc2, 'change')
    setTimeout(() => model2.del(collectionName, docId), 0)
    await eventToPromise(doc, 'change')

    assert(!doc.get())
    assert(!doc2.get())
  })

  it('should subscribe query and get it', async () => {
    let query = model.query(collectionName, expression)
    await query.subscribe()
    setTimeout(() => model2.add(collectionName, getDocData()), 0)
    await eventToPromise(query, 'change')

    assert.equal(query.get().length, 1)
  })
})
