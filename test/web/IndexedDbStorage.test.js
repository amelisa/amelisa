import assert from 'assert'
import fakeIndexedDb from 'fake-indexeddb'
import IndexedDbStorage from '../../src/web/IndexedDbStorage'
import { collectionName, docId, field, value } from '../util'

global.window = {
  indexedDB: fakeIndexedDb
}
let storage

describe('IndexedDbStorage', () => {
  beforeEach(async () => {
    storage = new IndexedDbStorage(['users'], 1)
    await storage.init()
  })

  it('should save and get doc', async () => {
    let prevVersion = null
    let version = '2'
    let state = {
      [field]: value
    }
    let ops = []

    await storage.saveDoc(collectionName, docId, state, prevVersion, version, ops)

    let docs = await storage.getAllDocs(collectionName)

    assert(docs)
    assert.equal(docs.length, 1)
    let doc = docs[0]
    assert(doc)
    assert.equal(doc._id, docId)
    assert.equal(doc._ops.length, 0)
  })

  it.skip('should save and get docs', async () => {
    let prevVersion = null
    let version = '2'
    let state = {
      [field]: value
    }
    let ops = []

    await storage.saveDoc(collectionName, docId, state, prevVersion, version, ops)

    let docs = await storage.getAllDocs(collectionName)

    assert(docs)
    assert.equal(docs.length, 1)
    assert.equal(docs[0]._id, docId)
    assert.equal(docs[0][field], value)
  })
})
