import assert from 'assert'
import { collectionName, docId, field, value } from '../util'

let shouldBehaveLikeMongoQueriesStorage = function () {
  describe('mongoqueriesstorage', () => {
    before(async () => {
      await this.storage.init()
    })

    after(async () => {
      await this.storage.clear()
    })

    beforeEach(async () => {
      await this.storage.clear()
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

      await this.storage.saveOp(op)

      let ops = await this.storage.getOpsByQuery(collectionName)

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

      await this.storage.saveDoc(collectionName, docId, state, prevVersion, version, ops)

      let doc = await this.storage.getDocById(collectionName, docId)

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

      await this.storage
        .saveDoc(collectionName, docId, state, prevVersion, version, ops)
        .catch((err) => {
          assert.equal(err.message, 'stale data')
          done()
        })
    })

    it('should save and get all docs', async () => {
      let prevVersion = null
      let version = '2'
      let state = {
        [field]: value
      }
      let ops = []

      await this.storage.saveDoc(collectionName, docId, state, prevVersion, version, ops)

      let docs = await this.storage.getDocsByQuery(collectionName, {})

      assert(docs)
      assert.equal(docs.length, 1)
      assert.equal(docs[0].id, docId)
      assert.equal(docs[0]._v, version)
      assert.equal(docs[0][field], value)
    })

    it('should run mongo queries', async () => {
      let prevVersion = null
      let version = '1'
      let ops = []

      await this.storage.saveDoc(collectionName, '1', {value: 1}, prevVersion, version, ops)
      await this.storage.saveDoc(collectionName, '2', {value: 2}, prevVersion, version, ops)
      await this.storage.saveDoc(collectionName, '3', {value: 3, [field]: value, nested: {[field]: value}}, prevVersion, version, ops)

      let docs = await this.storage.getDocsByQuery(collectionName, {})
      assert.equal(docs.length, 3)

      docs = await this.storage.getDocsByQuery(collectionName, {value: 1})
      assert.equal(docs.length, 1)

      docs = await this.storage.getDocsByQuery(collectionName, {value: {$not: {$eq: 1}}})
      assert.equal(docs.length, 2)

      docs = await this.storage.getDocsByQuery(collectionName, {value: {$eq: 1}})
      assert.equal(docs.length, 1)

      docs = await this.storage.getDocsByQuery(collectionName, {value: {$ne: 1}})
      assert.equal(docs.length, 2)

      docs = await this.storage.getDocsByQuery(collectionName, {value: {$gt: 1}})
      assert.equal(docs.length, 2)

      docs = await this.storage.getDocsByQuery(collectionName, {value: {$not: {$gt: 1}}})
      assert.equal(docs.length, 1)

      docs = await this.storage.getDocsByQuery(collectionName, {value: {$gte: 1}})
      assert.equal(docs.length, 3)

      docs = await this.storage.getDocsByQuery(collectionName, {value: {$lt: 3}})
      assert.equal(docs.length, 2)

      docs = await this.storage.getDocsByQuery(collectionName, {value: {$lte: 3}})
      assert.equal(docs.length, 3)

      docs = await this.storage.getDocsByQuery(collectionName, {value: {$in: [1, 2, 4]}})
      assert.equal(docs.length, 2)

      docs = await this.storage.getDocsByQuery(collectionName, {value: {$nin: [1, 2, 4]}})
      assert.equal(docs.length, 1)

      docs = await this.storage.getDocsByQuery(collectionName, {[field]: {$exists: true}})
      assert.equal(docs.length, 1)

      docs = await this.storage.getDocsByQuery(collectionName, {[field]: {$exists: false}})
      assert.equal(docs.length, 2)

      docs = await this.storage.getDocsByQuery(collectionName, {[`nested.${field}`]: {$exists: true}})
      assert.equal(docs.length, 1)

      docs = await this.storage.getDocsByQuery(collectionName, {[`nested.${field}`]: {$exists: false}})
      assert.equal(docs.length, 2)

      docs = await this.storage.getDocsByQuery(collectionName, {[field]: {$regex: value}})
      assert.equal(docs.length, 1)

      docs = await this.storage.getDocsByQuery(collectionName, {[field]: {$regex: 'a1s2d3fr'}})
      assert.equal(docs.length, 0)
    })

    it('should run meta queries', async () => {
      let prevVersion = null
      let version = '1'
      let ops = []

      await this.storage.saveDoc(collectionName, '1', {value: 1}, prevVersion, version, ops)
      await this.storage.saveDoc(collectionName, '2', {value: 2}, prevVersion, version, ops)
      await this.storage.saveDoc(collectionName, '3', {value: 3}, prevVersion, version, ops)

      let docs = await this.storage.getDocsByQuery(collectionName, {})
      assert.equal(docs.length, 3)

      docs = await this.storage.getDocsByQuery(collectionName, {$orderby: {value: 1}})
      assert.equal(docs.length, 3)
      assert.deepEqual(docs.map((doc) => doc.value), [1, 2, 3])

      docs = await this.storage.getDocsByQuery(collectionName, {$orderby: {value: -1}})
      assert.equal(docs.length, 3)
      assert.deepEqual(docs.map((doc) => doc.value), [3, 2, 1])

      docs = await this.storage.getDocsByQuery(collectionName, {$limit: 1})
      assert.equal(docs.length, 1)
    })

    it('should save and get docs count', async () => {
      let prevVersion = null
      let version = '2'
      let state = {
        [field]: value
      }
      let ops = []

      await this.storage.saveDoc(collectionName, docId, state, prevVersion, version, ops)

      let count = await this.storage.getDocsByQuery(collectionName, {[field]: value, $count: true})

      assert.equal(count, 1)
    })

    it('should save and get distinct docs', async () => {
      let prevVersion = null
      let version = '1'
      let ops = []

      await this.storage.saveDoc(collectionName, '1', {[field]: value, value: 1}, prevVersion, version, ops)
      await this.storage.saveDoc(collectionName, '2', {[field]: value, value: 2}, prevVersion, version, ops)
      await this.storage.saveDoc(collectionName, '3', {[field]: value, value: 2}, prevVersion, version, ops)
      await this.storage.saveDoc(collectionName, '4', {value: 3}, prevVersion, version, ops)

      let data = await this.storage.getDocsByQuery(collectionName, {$distinct: true, $field: 'value'})
      assert.deepEqual(data, [1, 2, 3])

      data = await this.storage.getDocsByQuery(collectionName, {[field]: value, $distinct: true, $field: 'value'})
      assert.deepEqual(data, [1, 2])
    })

    it('should save and get aggregate docs', async () => {
      if (this.storage.aggregateQueriesSupport === false) return

      let prevVersion = null
      let version = '2'
      let state = {
        [field]: value
      }
      let ops = []

      await this.storage.saveDoc(collectionName, docId, state, prevVersion, version, ops)

      let data = await this.storage.getDocsByQuery(collectionName, {
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
}

export default {
  shouldBehaveLikeMongoQueriesStorage
}
