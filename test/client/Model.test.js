import assert from 'assert'
import ClientQuery from '../../src/client/ClientQuery'
import Model from '../../src/client/Model'
import ServerChannel from '../../src/server/ServerChannel'
import { source, collectionName, localCollectionName, docId, field, value } from '../util'

let channel
let model

describe('Model', () => {
  describe('mutations', () => {
    beforeEach(() => {
      channel = new ServerChannel()
      model = new Model(channel, source)
    })

    it('should get nothing from empty model', () => {
      let value = model.get(collectionName)

      assert.equal(value, undefined)
      value = model.get(collectionName, docId)
      assert.equal(value, undefined)
      value = model.get(collectionName, docId, field)
      assert.equal(value, undefined)
    })

    it('should add without docId', () => {
      let doc = {
        [field]: value
      }

      model.add(collectionName, doc)

      let collectionData = model.get(collectionName)
      assert.equal(Object.keys(collectionData).length, 1)
      let newId = Object.keys(collectionData)[0]
      let newDoc = model.get(collectionName, newId)
      assert.equal(newDoc._id, newId)
      assert.equal(newDoc.name, doc.name)
    })

    it('should add with docId', () => {
      let doc = {
        _id: docId,
        [field]: value
      }

      model.add(collectionName, doc)

      let collectionData = model.get(collectionName)
      assert.equal(Object.keys(collectionData).length, 1)
      let newId = Object.keys(collectionData)[0]
      assert.equal(newId, docId)
      let name = model.get(collectionName, newId, field)
      assert.equal(name, value)
      let newDoc = model.get(collectionName, newId)
      assert.equal(newDoc._id, newId)
      assert.equal(newDoc.name, doc.name)
    })

    it('should del field', async () => {
      let doc = {
        _id: docId,
        [field]: value
      }
      await model.add(collectionName, doc)

      model.del([collectionName, docId, field])

      let name = model.get(collectionName, docId, field)
      assert.equal(name, undefined)
      let newDoc = model.get(collectionName, docId)
      assert.equal(newDoc._id, docId)
      assert.equal(newDoc.name, undefined)
    })

    it('should del doc', async () => {
      let doc = {
        _id: docId,
        [field]: value
      }
      await model.add(collectionName, doc)

      model.del([collectionName, docId])

      let newDoc = model.get(collectionName, docId)
      assert.equal(newDoc, undefined)
      let name = model.get(collectionName, docId, field)
      assert.equal(name, undefined)
    })

    it('should set when array', async () => {
      let doc = {
        _id: docId,
        [field]: value
      }
      await model.add(collectionName, doc)
      let newValue = 'Vasya'

      model.set([collectionName, docId, field], newValue)

      let name = model.get(collectionName, docId, field)
      assert.equal(name, newValue)
    })

    it('should set when path', async () => {
      let doc = {
        _id: docId,
        [field]: value
      }
      await model.add(collectionName, doc)
      let newValue = 'Vasya'

      model.set(`${collectionName}.${docId}.${field}`, newValue)

      let name = model.get(collectionName, docId, field)
      assert.equal(name, newValue)
    })

    it('should set doc', () => {
      let doc = {
        [field]: value
      }

      model.set([collectionName, docId], doc)

      let newDoc = model.get(collectionName, docId)
      assert.equal(newDoc._id, docId)
      assert.equal(newDoc[field], value)
      let name = model.get(collectionName, docId, field)
      assert.equal(name, value)
    })

    it('should set value as doc', () => {
      model.set([collectionName, docId], value)

      let newDoc = model.get(collectionName, docId)
      assert.equal(newDoc, value)
    })

    it('should set value as doc on local collection', () => {
      model.set([localCollectionName, docId], value)

      let newDoc = model.get(localCollectionName, docId)
      assert.equal(newDoc, value)
      let collectionData = model.get(localCollectionName)
      assert.equal(collectionData[docId], value)
    })

    it('should set value as doc on local collection when not array', () => {
      model.set(`${collectionName}.${docId}`, value)

      let newDoc = model.get(`${collectionName}.${docId}`)
      assert.equal(newDoc, value)
      let collectionData = model.get(collectionName)
      assert.equal(collectionData[docId], value)
    })

    it('should set on empty doc', () => {
      model.set([collectionName, docId, field], value)

      let name = model.get(collectionName, docId, field)
      assert.equal(name, value)
    })

    it('should return query', () => {
      let expression = {
        [field]: value
      }

      let query = model.query(collectionName, expression)

      assert(query)
      assert(query instanceof ClientQuery)
      assert.equal(query.collectionName, collectionName)
      assert.equal(query.expression.name, expression.name)
    })

    it('should create op', () => {
      let opData = {
        type: 'test'
      }

      let op = model.createOp(opData)

      assert(op)
      assert(op.id)
      assert(op.date)
      assert.equal(op.source, model.source)
      assert.equal(op.type, opData.type)
      assert.equal(Object.keys(op).length, 4)
    })

    it('should return date', () => {
      let date = model.date()

      assert(date)
      assert(typeof date === 'number')
    })

    it('should return id', () => {
      let id = model.id()

      assert(id)
      assert(typeof id === 'string')
    })
  })

  describe('ops', () => {
    beforeEach(() => {
      channel = new ServerChannel()
      model = new Model(channel, 'test')
      model.online = true
    })

    it('should send op on add', () => {
      let doc = {
        _id: docId,
        [field]: value
      }

      return new Promise((resolve, reject) => {
        channel.send = (op) => {
          assert(op)
          assert.equal(op.type, 'add')
          resolve()
        }

        model.add(collectionName, doc)
      })
    })

    it('should send op on set', () => {
      return new Promise((resolve, reject) => {
        channel.send = (op) => {
          assert(op)
          assert.equal(op.type, 'set')
          resolve()
        }

        model.set([collectionName, docId, field], value)
      })
    })

    it('should send op on del doc', () => {
      return new Promise((resolve, reject) => {
        channel.send = (op) => {
          assert(op)
          assert.equal(op.type, 'del')
          resolve()
        }

        model.del([collectionName, docId])
      })
    })

    it('should send op on del field', () => {
      return new Promise((resolve, reject) => {
        channel.send = (op) => {
          assert(op)
          assert.equal(op.type, 'del')
          resolve()
        }

        model.del([collectionName, docId, field])
      })
    })
  })

  describe('other', () => {
    beforeEach(() => {
      channel = new ServerChannel()
      model = new Model(channel, 'test')
      model.online = true
    })

    it('get collectionNames to clear', () => {
      let prevProjectionHashes = {
        users: 'some hash',
        orders: 'hash',
        products: 'hash'
      }

      let newProjectionHashes = {
        users: 'some hash',
        orders: 'other hash',
        categories: 'hash'
      }

      let collectionNames = model.getCollectionNamesToClear(prevProjectionHashes, newProjectionHashes)

      assert.equal(collectionNames.length, 2)
      assert.equal(collectionNames[0], 'orders')
      assert.equal(collectionNames[1], 'products')
    })
  })
})
