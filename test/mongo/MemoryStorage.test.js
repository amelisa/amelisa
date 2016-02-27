import assert from 'assert'
import MemoryStorage from '../../src/mongo/MemoryStorage'
import { collectionName, docId, field, value } from '../util'

let storage = new MemoryStorage()

describe('MemoryStorage', () => {
  beforeEach(async () => {
    await storage.clear()
  })

  it('should save and get doc', async () => {
    let prevVersion = null
    let version = '2'
    let state = {
      [field]: value
    }
    let ops = []

    await storage.saveDoc(collectionName, docId, state, prevVersion, version, ops)

    let doc = await storage.getDocById(collectionName, docId)

    assert(doc)
    assert.equal(doc._id, docId)
    assert.equal(doc._v, version)
    assert.equal(doc[field], value)
  })

  it('should save and get docs', async () => {
    let prevVersion = null
    let version = '2'
    let state = {
      [field]: value
    }
    let ops = []

    await storage.saveDoc(collectionName, docId, state, prevVersion, version, ops)

    let docs = await storage.getDocsByQuery(collectionName, {[field]: value})

    assert(docs)
    assert.equal(docs.length, 1)
    assert.equal(docs[0]._id, docId)
    assert.equal(docs[0]._v, version)
    assert.equal(docs[0][field], value)
  })
})
