import assert from 'assert'
import fakeIndexedDb from 'fake-indexeddb'
import localStorage from 'localStorage'
import IndexedDbStorage from '../../src/web/IndexedDbStorage'
import { collectionName, docId } from '../util'

global.window = {
  indexedDB: fakeIndexedDb,
  localStorage
}
let storage

describe('IndexedDbStorage', () => {
  beforeEach(async () => {
    storage = new IndexedDbStorage(['users'], 1)
    await storage.init()
  })

  afterEach(() => {
    storage.close()
    fakeIndexedDb.deleteDatabase('amelisa')
  })

  it('should save and get doc', async () => {
    let serverVersion = '2'
    let ops = []

    await storage.saveDoc(collectionName, docId, ops, serverVersion)

    let docs = await storage.getAllDocs(collectionName)

    assert(docs)
    assert.equal(docs.length, 1)
    let doc = docs[0]
    assert(doc)
    assert.equal(Object.keys(doc).length, 3)
    assert.equal(doc._id, docId)
    assert.equal(doc._ops.length, 0)
    assert.equal(doc._sv, serverVersion)
  })
})
