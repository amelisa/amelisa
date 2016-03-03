import assert from 'assert'
import eventToPromise from 'event-to-promise'
import { MemoryStorage, Store } from '../src/server'
import { collectionName, docId, expression, getDocData } from './util'
import ServerChannel from '../src/server/ServerChannel'

let storage
let store
let store2
let model
let model2

describe('multystore', () => {
  beforeEach(async () => {
    storage = new MemoryStorage()
    await storage.init()

    let pub = new ServerChannel()
    let sub = new ServerChannel()
    pub.pipe(sub).pipe(pub)
    pub.open()

    store = new Store(storage, pub, sub, {source: 'store1'})
    store2 = new Store(storage, pub, sub, {source: 'store2'})
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

  it('should subscribe query and get it', async () => {
    let query = model.query(collectionName, expression)
    await query.subscribe()
    setTimeout(() => model2.add(collectionName, getDocData()), 0)
    await eventToPromise(query, 'change')

    assert.equal(query.get().length, 1)
  })
})
