import assert from 'assert'
import eventToPromise from 'event-to-promise'
import { MemoryStorage } from '../../src/mongo'
import { Store } from '../../src/server'
import { collectionName, docId, getDocData, sleep } from '../util'

let storage
let store
let model
let model2

describe('offline doc', () => {
  beforeEach(async () => {
    storage = new MemoryStorage()
    store = new Store(storage, null, {saveDebounceTimeout: 0})
    await store.init()
    model = store.createModel({isClient: true})
    model2 = store.createModel({isClient: true})
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
    await sleep(20)

    assert(doc.get())
  })
})
