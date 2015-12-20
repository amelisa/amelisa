import assert from 'assert'
import MongoStorage from '../src/MongoStorage'
import { collectionName, docId, field, value } from './util'

let mongoUrl = 'mongodb://localhost:27017/test'
let storage = new MongoStorage(mongoUrl)

describe.skip('MongoStorage', () => {
  before(async () => {
    await storage.init()
  })

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

    let doc = storage.getDocById(collectionName, docId)

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

    let docs = storage.getDocsByQuery(collectionName, {[field]: value})

    assert(docs)
    assert.equal(docs.length, 1)
    assert.equal(docs[0]._id, docId)
    assert.equal(docs[0]._v, version)
    assert.equal(docs[0][field], value)
  })
})
