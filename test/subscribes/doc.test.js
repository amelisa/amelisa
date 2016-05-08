import assert from 'assert'
import eventToPromise from 'event-to-promise'
import { Store } from '../../src/server'
import { getStorage, collectionName, docId, field, value, value2, getDocData, sleep } from '../util'

let storage
let store
let model
let model2

describe('subscribes doc', () => {
  beforeEach(async () => {
    storage = await getStorage()
    store = new Store({storage, saveDebounceTimeout: 0})
    await store.init()
    model = store.createModel()
    model2 = store.createModel()
  })

  it('should fetch empty doc if doc not exists', async () => {
    let doc = model.doc(collectionName, docId)
    await doc.fetch()

    assert(!doc.get())
  })

  it('should fetch doc', async () => {
    let doc = model.doc(collectionName, docId)
    await model2.add(collectionName, getDocData())
    await doc.fetch()

    assert(doc.get())
    assert.equal(doc.get(field), value)
  })

  it('should fetch doc two times', async () => {
    let doc = model.doc(collectionName, docId)
    await model2.add(collectionName, getDocData())
    await doc.fetch()
    await doc.fetch()

    assert(doc.get())
    assert.equal(doc.get(field), value)
  })

  it('should fetch doc with operations', async () => {
    let doc = model.doc(collectionName, docId)
    await model2.add(collectionName, getDocData())
    await model2.set([collectionName, docId, field], value2)
    await doc.fetch()

    assert(doc.get())
    assert.equal(doc.get(field), value2)
  })

  it('should fetch empty doc if doc was deleted', async () => {
    let doc = model.doc(collectionName, docId)
    await model2.add(collectionName, getDocData())
    await doc.fetch()
    await model2.del(collectionName, docId)
    await doc.fetch()

    assert(!doc.get())
  })

  it('should fetchAndGet doc', async () => {
    let doc = model.doc(collectionName, docId)
    await model2.add(collectionName, getDocData())
    let docData = await doc.fetchAndGet()

    assert(docData)
    assert.deepEqual(docData, getDocData())
  })

  it('should subscribe empty doc if doc not exists', async () => {
    let doc = model.doc(collectionName, docId)
    await doc.subscribe()
    assert(!doc.get())
  })

  it('should subscribe doc', async () => {
    let doc = model.doc(collectionName, docId)
    await model2.add(collectionName, getDocData())
    await doc.subscribe()

    assert(doc.get())
    assert.equal(doc.get(field), value)
  })

  it('should subscribe doc two times', async () => {
    let doc = model.doc(collectionName, docId)
    await model2.add(collectionName, getDocData())
    await doc.subscribe()
    await doc.subscribe()

    assert(doc.get())
    assert.equal(doc.get(field), value)
  })

  it('should subscribe doc without fetch when doc is empty', async () => {
    let doc = model.doc(collectionName, docId)
    await model2.add(collectionName, getDocData())
    await doc.subscribe({fetch: false})

    assert(!doc.get())

    await eventToPromise(doc, 'change')

    assert(doc.get())
    assert.equal(doc.get(field), value)
  })

  it('should subscribe doc without fetch when doc not empty', async () => {
    let doc = model.doc(collectionName, docId)
    await model.add(collectionName, getDocData())
    await model2.set([collectionName, docId, field], value2)
    await doc.subscribe({fetch: false})

    assert(doc.get())
    assert.equal(doc.get(field), value)

    await eventToPromise(doc, 'change')

    assert(doc.get())
    assert.equal(doc.get(field), value2)
  })

  it('should subscribe doc if doc in same model', async () => {
    let doc = model.doc(collectionName, docId)
    await model.add(collectionName, getDocData())
    await doc.subscribe()

    assert(doc.get())
    assert.equal(doc.get(field), value)
  })

  it('should subscribe doc and get it as it added', async () => {
    let doc = model.doc(collectionName, docId)
    await doc.subscribe()
    setTimeout(() => model2.add(collectionName, getDocData()))
    await eventToPromise(doc, 'change')

    assert(doc.get())
    assert.equal(doc.get(field), value)
  })

  it('should subscribe doc and get it as it added in same model', async () => {
    let doc = model.doc(collectionName, docId)
    await doc.subscribe()
    setTimeout(() => model.add(collectionName, getDocData()))
    await eventToPromise(doc, 'change')

    assert(doc.get())
    assert.equal(doc.get(field), value)
  })

  it('should subscribe doc and changes it as it was changed', async () => {
    let doc = model.doc(collectionName, docId)
    await model2.add(collectionName, getDocData())
    await doc.subscribe()
    setTimeout(() => model2.set([collectionName, docId, field], value2))
    await eventToPromise(doc, 'change')

    assert(doc.get(field), value2)
  })

  it('should subscribe doc and changes it as it was changed in same model', async () => {
    let doc = model.doc(collectionName, docId)
    await model.add(collectionName, getDocData())
    await doc.subscribe()
    setTimeout(() => model.set([collectionName, docId, field], value2))
    await eventToPromise(doc, 'change')

    assert(doc.get(field), value2)
  })

  it('should subscribe doc and del it as it was deleted', async () => {
    let doc = model.doc(collectionName, docId)
    await model2.add(collectionName, getDocData())
    await doc.subscribe()
    setTimeout(() => model2.del(collectionName, docId))
    await eventToPromise(doc, 'change')

    assert(!doc.get())
  })

  it('should subscribe doc and del it as it was deleted in same model', async () => {
    let doc = model.doc(collectionName, docId)
    await model.add(collectionName, getDocData())
    await doc.subscribe()
    await model.del(collectionName, docId)
    await sleep(20)

    assert(!doc.get())
  })

  it('should emit only one change when subscribed and on doc with some ops', async (done) => {
    let doc = model.doc(collectionName, docId)
    await model2.add(collectionName, getDocData())
    await model2.set([collectionName, docId, field], 'Petr')
    await model2.set([collectionName, docId, field], 'Vasya')
    await model2.set([collectionName, docId, 'age'], 20)

    doc.on('change', done)
    doc.subscribe()
  })

  it('should emit only one change when subscribed and on doc and set field', async (done) => {
    let doc = model.doc(collectionName, docId)
    await doc.subscribe()

    doc.on('change', done)
    doc.set(field, value)
  })
})
