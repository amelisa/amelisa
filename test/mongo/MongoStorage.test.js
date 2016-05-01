import assert from 'assert'
import MongoStorage from '../../src/mongo/MongoStorage'
import { collectionName, docId, field, value } from '../util'

let mongoUrl = 'mongodb://localhost:27017/test'
let storage = new MongoStorage(mongoUrl)

describe.skip('MongoStorage', () => {
  before(async () => {
    await storage.init()
  })

  after(async () => {
    await storage.clear()
  })

  beforeEach(async () => {
    await storage.clear()
  })

  it('should save and get op', async () => {
    let op = {
      id: docId,
      type: 'add',
      collectionName,
      docId,
      field,
      value
    }

    await storage.saveOp(op)

    let ops = await storage.getOpsByQuery(collectionName)

    assert(ops)
    assert.equal(ops.length, 1)
    assert.deepEqual(ops[0], op)
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
    assert.equal(doc.id, docId)
    assert.equal(doc._v, version)
    assert.equal(doc[field], value)
  })

  it('should throw error when save doc with wrong prev version', async (done) => {
    let prevVersion = '1'
    let version = '2'
    let state = {
      [field]: value
    }
    let ops = []

    await storage
      .saveDoc(collectionName, docId, state, prevVersion, version, ops)
      .catch((err) => {
        assert.equal(err.message, 'stale data')
        done()
      })
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
    assert.equal(docs[0].id, docId)
    assert.equal(docs[0]._v, version)
    assert.equal(docs[0][field], value)
  })

  it('should save and get docs count', async () => {
    let prevVersion = null
    let version = '2'
    let state = {
      [field]: value
    }
    let ops = []

    await storage.saveDoc(collectionName, docId, state, prevVersion, version, ops)

    let count = await storage.getDocsByQuery(collectionName, {[field]: value, $count: true})

    assert.equal(count, 1)
  })

  it('should save and get distinct docs', async () => {
    let prevVersion = null
    let version = '2'
    let state = {
      [field]: value
    }
    let ops = []

    await storage.saveDoc(collectionName, docId, state, prevVersion, version, ops)

    let data = await storage.getDocsByQuery(collectionName, {[field]: value, $distinct: true, $field: field})

    assert(data)
    assert.equal(data.length, 1)
    assert.equal(data[0], value)
  })

  it('should save and get aggregate docs', async () => {
    let prevVersion = null
    let version = '2'
    let state = {
      [field]: value
    }
    let ops = []

    await storage.saveDoc(collectionName, docId, state, prevVersion, version, ops)

    let data = await storage.getDocsByQuery(collectionName, {
      $aggregate: [{
        $group: {
          _id: `$${field}`
        }
      }]
    })

    assert(data)
    assert.equal(data.length, 1)
    assert.equal(data[0]._id, value)
  })
})
