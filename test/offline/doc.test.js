import assert from 'assert'
import eventToPromise from 'event-to-promise'
import { MemoryStorage, Store } from '../../src/server'
import { collectionName, docId, getDocData, sleep } from '../util'

let storage
let store
let model
let model2

describe('offline doc', () => {
  beforeEach(async () => {
    storage = new MemoryStorage()
    await storage.init()

    store = new Store(storage, null, {saveDebounceTimeout: 0})
    model = store.createModel({isClient: true})
    model.source = 'model1'
    model2 = store.createModel({isClient: true})
    model2.source = 'model2'
    await model.onReady()
    await model2.onReady()
  })

  it('should send ops on online when subscribed to doc', async () => {
    let doc = model.doc(collectionName, docId)
    await doc.subscribe()
    model2.close()
    await model2.add(collectionName, getDocData())

    assert(!doc.get())

    store.connectModel(model2)
    await eventToPromise(doc, 'change')

    assert(doc.get())
  })

  it('should receive ops on online when subscribed to doc', async () => {
    let doc = model.doc(collectionName, docId)
    await doc.subscribe()
    model.close()
    await model2.add(collectionName, getDocData())

    assert(!doc.get())

    store.connectModel(model)
    await eventToPromise(doc, 'change')

    assert(doc.get())
  })

  it('should send and receive ops on online when subscribed to doc', async () => {
    let doc = model.doc(collectionName, docId)
    await doc.subscribe()
    model.close()
    model2.close()
    await model2.add(collectionName, getDocData())
    store.connectModel(model)
    store.connectModel(model2)
    await sleep(10)

    assert(doc.get())
  })
})
