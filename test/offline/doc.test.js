import assert from 'assert'
import eventToPromise from 'event-to-promise'
import { Store } from '../../src/server'
import { getStorage, collectionName, docId, field, value, getDocData, sleep } from '../util'

let storage
let store
let model
let model2

describe('offline doc', () => {
  beforeEach(async () => {
    storage = await getStorage()
    store = new Store({storage, saveDebounceTimeout: 0})
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

  it.skip('should send and receive ops on online when subscribed to doc', async () => {
    let doc = model.doc(collectionName, docId)
    await doc.subscribe()
    model.close()
    model2.close()
    await model2.add(collectionName, getDocData())
    store.connectModel(model)
    store.connectModel(model2)
    await eventToPromise(doc, 'change')
    await eventToPromise(doc, 'change')

    assert(doc.get())
  })

  it('should not send add op on online when already sent', async () => {
    let doc = model.doc(collectionName, docId)
    await doc.subscribe()
    await model2.add(collectionName, getDocData())
    await sleep(20)

    assert(doc.get())

    model.close()
    model2.close()
    let hookCalled = false
    store.afterHook = async (op) => {
      hookCalled = true
    }
    store.connectModel(model)
    store.connectModel(model2)
    await sleep(20)
    if (hookCalled) throw new Error('afterHook called')
  })

  it('should not send add op on online when already sent and same model', async () => {
    let doc = model.doc(collectionName, docId)
    await doc.subscribe()
    await model.add(collectionName, getDocData())
    await sleep(20)

    assert(doc.get())

    model.close()
    model2.close()
    let hookCalled = false
    store.afterHook = async (op) => {
      hookCalled = true
    }
    store.connectModel(model)
    store.connectModel(model2)
    await sleep(20)
    if (hookCalled) throw new Error('afterHook called')
  })

  it('should not send set op on online when already sent', async () => {
    let doc = model.doc(collectionName, docId)
    await doc.subscribe()
    await model2.set([collectionName, docId, field], value)
    await sleep(20)

    assert(doc.get())

    model.close()
    model2.close()
    let hookCalled = false
    store.afterHook = async (op) => {
      hookCalled = true
    }
    store.connectModel(model)
    store.connectModel(model2)
    await sleep(20)
    if (hookCalled) throw new Error('afterHook called')
  })

  it('should not send set op on online when already sent and same model', async () => {
    let doc = model.doc(collectionName, docId)
    await doc.subscribe()
    await model2.set([collectionName, docId, field], value)
    await sleep(20)

    assert(doc.get())

    model.close()
    model2.close()
    let hookCalled = false
    store.afterHook = async (op) => {
      hookCalled = true
    }
    store.connectModel(model)
    store.connectModel(model2)
    await sleep(20)
    if (hookCalled) throw new Error('afterHook called')
  })

  it('should send and receive string ops on online when subscribed to doc', async () => {
    let doc = model.doc(collectionName, docId)
    await doc.subscribe()
    let doc2 = model2.doc(collectionName, docId)
    await doc2.subscribe()
    await doc.stringDiff(field, 'asdf')
    await sleep(20)

    assert.equal(doc.get(field), 'asdf')
    assert.equal(doc2.get(field), 'asdf')
    model.close()
    model2.close()
    await doc.stringInsert(field, 0, '1')
    await doc.stringInsert(field, 1, '2')
    await doc2.stringInsert(field, 4, '2')
    await doc2.stringInsert(field, 5, '3')

    store.connectModel(model)
    store.connectModel(model2)
    await [
      eventToPromise(doc, 'change'),
      eventToPromise(doc2, 'change')
    ]

    assert(doc.get(field), '12asdf23')
  })
})
