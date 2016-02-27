import assert from 'assert'
import Projection from '../../src/server/Projection'
import { collectionName, dbCollectionName, docId, value } from '../util'

let projection

describe('Projection', () => {
  describe('validation', () => {
    it('should not throw an error when all fields are inclusive', () => {
      let fields = {
        _id: true,
        name: true,
        age: true
      }

      new Projection(collectionName, dbCollectionName, fields) // eslint-disable-line
    })

    it('should not throw an error when all fields are exclusive', () => {
      let fields = {
        name: false,
        age: false
      }

      new Projection(collectionName, dbCollectionName, fields) // eslint-disable-line
    })

    it('should throw an error when different fields', () => {
      let fields = {
        name: true,
        age: false
      }

      try {
        new Projection(collectionName, dbCollectionName, fields) // eslint-disable-line
      } catch (err) {
        return assert(err)
      }
      throw new Error('Should be error')
    })

    it('should throw an error when inclusive without _id', () => {
      let fields = {
        name: true
      }

      try {
        new Projection(collectionName, dbCollectionName, fields) // eslint-disable-line
      } catch (err) {
        return assert(err)
      }
      throw new Error('Should be error')
    })

    it('should throw an error when exclusive with _id', () => {
      let fields = {
        _id: false,
        name: false
      }

      try {
        new Projection(collectionName, dbCollectionName, fields) // eslint-disable-line
      } catch (err) {
        return assert(err)
      }
      throw new Error('Should be error')
    })
  })

  describe('inclusive', () => {
    beforeEach(() => {
      let fields = {
        _id: true,
        name: true
      }

      projection = new Projection(collectionName, dbCollectionName, fields)
    })

    it('should return hash', () => {
      let hash = projection.getHash()

      assert.equal(hash, '_id:true,name:true')
    })

    it('should project doc', () => {
      let doc = {
        _id: docId,
        name: value,
        age: 14,
        _ops: [],
        _v: 'v1'
      }

      let projectedDoc = projection.projectDoc(doc)

      assert.equal(Object.keys(projectedDoc).length, 4)
      assert.equal(projectedDoc._id, doc._id)
      assert.equal(projectedDoc.name, doc.name)
      assert.equal(projectedDoc.age, undefined)
      assert.equal(projectedDoc._ops.length, 0)
      assert.equal(projectedDoc._v, doc._v)
    })

    it('should project add op', () => {
      let op = {
        type: 'add',
        value: {
          _id: docId,
          name: value,
          age: 14
        }
      }

      let projectedOp = projection.projectOp(op)

      assert.equal(Object.keys(projectedOp.value).length, 2)
    })

    it('should project set op on right field', () => {
      let op = {
        type: 'set',
        field: 'name',
        value: 'Petr'
      }

      let projectedOp = projection.projectOp(op)

      assert(projectedOp)
    })

    it('should project set op on wrong field', () => {
      let op = {
        type: 'set',
        field: 'age',
        value: 15
      }

      let projectedOp = projection.projectOp(op)

      assert(!projectedOp)
    })

    it('should project del op on right field', () => {
      let op = {
        type: 'del',
        field: 'name'
      }

      let projectedOp = projection.projectOp(op)

      assert(projectedOp)
    })

    it('should project del op on wrong field', () => {
      let op = {
        type: 'del',
        field: 'age'
      }

      let projectedOp = projection.projectOp(op)

      assert(!projectedOp)
    })

    it('should project del op without field', () => {
      let op = {
        type: 'del'
      }

      let projectedOp = projection.projectOp(op)

      assert(projectedOp)
    })

    it('should validate add op on right fields', () => {
      let op = {
        type: 'add',
        value: {
          _id: docId,
          name: value
        }
      }

      let error = projection.validateOp(op)

      assert(!error)
    })

    it('should validate add op on wrong fields', () => {
      let op = {
        type: 'add',
        value: {
          _id: docId,
          name: value,
          age: 14
        }
      }

      let error = projection.validateOp(op)

      assert(error)
    })

    it('should project set op on right field', () => {
      let op = {
        type: 'set',
        field: 'name',
        value: 'Petr'
      }

      let error = projection.validateOp(op)

      assert(!error)
    })

    it('should project set op on right field', () => {
      let op = {
        type: 'set',
        field: 'age',
        value: 15
      }

      let error = projection.validateOp(op)

      assert(error)
    })

    it('should project del op on right field', () => {
      let op = {
        type: 'del',
        field: 'name'
      }

      let error = projection.validateOp(op)

      assert(!error)
    })

    it('should project del op on right field', () => {
      let op = {
        type: 'del',
        field: 'age'
      }

      let error = projection.validateOp(op)

      assert(error)
    })

    it('should project del op without field', () => {
      let op = {
        type: 'del'
      }

      let error = projection.validateOp(op)

      assert(!error)
    })
  })

  describe('exclusive', () => {
    beforeEach(() => {
      let fields = {
        age: false
      }

      projection = new Projection(collectionName, dbCollectionName, fields)
    })

    it('should return hash', () => {
      let hash = projection.getHash()

      assert.equal(hash, 'age:false')
    })

    it('should project doc', () => {
      let doc = {
        _id: docId,
        name: value,
        age: 14,
        _ops: [],
        _v: 'v1'
      }

      let projectedDoc = projection.projectDoc(doc)

      assert.equal(Object.keys(projectedDoc).length, 4)
      assert.equal(projectedDoc._id, doc._id)
      assert.equal(projectedDoc.name, doc.name)
      assert.equal(projectedDoc.age, undefined)
      assert.equal(projectedDoc._ops.length, 0)
      assert.equal(projectedDoc._v, doc._v)
    })

    it('should project add op', () => {
      let op = {
        type: 'add',
        value: {
          _id: docId,
          name: value,
          age: 14
        }
      }

      let projectedOp = projection.projectOp(op)

      assert.equal(Object.keys(projectedOp.value).length, 2)
    })

    it('should project set op on right field', () => {
      let op = {
        type: 'set',
        field: 'name',
        value: 'Petr'
      }

      let projectedOp = projection.projectOp(op)

      assert(projectedOp)
    })

    it('should project set op on wrong field', () => {
      let op = {
        type: 'set',
        field: 'age',
        value: 15
      }

      let projectedOp = projection.projectOp(op)

      assert(!projectedOp)
    })

    it('should project del op on right field', () => {
      let op = {
        type: 'del',
        field: 'name'
      }

      let projectedOp = projection.projectOp(op)

      assert(projectedOp)
    })

    it('should project del op on wrong field', () => {
      let op = {
        type: 'del',
        field: 'age'
      }

      let projectedOp = projection.projectOp(op)

      assert(!projectedOp)
    })

    it('should project del op without field', () => {
      let op = {
        type: 'del'
      }

      let projectedOp = projection.projectOp(op)

      assert(projectedOp)
    })

    it('should validate add op on right fields', () => {
      let op = {
        type: 'add',
        value: {
          _id: docId,
          name: value
        }
      }

      let error = projection.validateOp(op)

      assert(!error)
    })

    it('should validate add op on wrong fields', () => {
      let op = {
        type: 'add',
        value: {
          _id: docId,
          name: value,
          age: 14
        }
      }

      let error = projection.validateOp(op)

      assert(error)
    })

    it('should project set op on right field', () => {
      let op = {
        type: 'set',
        field: 'name',
        value: 'Petr'
      }

      let error = projection.validateOp(op)

      assert(!error)
    })

    it('should project set op on right field', () => {
      let op = {
        type: 'set',
        field: 'age',
        value: 15
      }

      let error = projection.validateOp(op)

      assert(error)
    })

    it('should project del op on right field', () => {
      let op = {
        type: 'del',
        field: 'name'
      }

      let error = projection.validateOp(op)

      assert(!error)
    })

    it('should project del op on right field', () => {
      let op = {
        type: 'del',
        field: 'age'
      }

      let error = projection.validateOp(op)

      assert(error)
    })

    it('should project del op without field', () => {
      let op = {
        type: 'del'
      }

      let error = projection.validateOp(op)

      assert(!error)
    })
  })
})
