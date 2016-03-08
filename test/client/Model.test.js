import assert from 'assert'
import ClientQuery from '../../src/client/ClientQuery'
import Model from '../../src/client/Model'
import ServerChannel from '../../src/server/ServerChannel'
import { source, collectionName, localCollectionName, docId, field, value, numValue, getDocData } from '../util'

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
      model.add(collectionName, getDocData())

      let collectionData = model.get(collectionName)
      assert.equal(Object.keys(collectionData).length, 1)
      let newId = Object.keys(collectionData)[0]
      let newDoc = model.get(collectionName, newId)
      assert.equal(newDoc._id, newId)
      assert.equal(newDoc[field], value)
    })

    it('should add with docId', () => {
      model.add(collectionName, getDocData())

      let collectionData = model.get(collectionName)
      assert.equal(Object.keys(collectionData).length, 1)
      let newId = Object.keys(collectionData)[0]
      assert.equal(newId, docId)
      let name = model.get(collectionName, newId, field)
      assert.equal(name, value)
      let newDoc = model.get(collectionName, newId)
      assert.equal(newDoc._id, newId)
      assert.equal(newDoc[field], value)
    })

    it('should del field', async () => {
      await model.add(collectionName, getDocData())

      model.del(collectionName, docId, field)

      let name = model.get(collectionName, docId, field)
      assert.equal(name, undefined)
      let newDoc = model.get(collectionName, docId)
      assert.equal(newDoc._id, docId)
      assert.equal(newDoc.name, undefined)
    })

    it('should del doc', async () => {
      await model.add(collectionName, getDocData())

      model.del(collectionName, docId)

      let newDoc = model.get(collectionName, docId)
      assert.equal(newDoc, undefined)
      let name = model.get(collectionName, docId, field)
      assert.equal(name, undefined)
    })

    it('should del field when array', async () => {
      await model.add(collectionName, getDocData())

      model.del([collectionName, docId, field])

      let name = model.get(collectionName, docId, field)
      assert.equal(name, undefined)
      let newDoc = model.get(collectionName, docId)
      assert.equal(newDoc._id, docId)
      assert.equal(newDoc.name, undefined)
    })

    it('should del doc when array', async () => {
      await model.add(collectionName, getDocData())

      model.del([collectionName, docId])

      let newDoc = model.get(collectionName, docId)
      assert.equal(newDoc, undefined)
      let name = model.get(collectionName, docId, field)
      assert.equal(name, undefined)
    })

    it('should del value on field when doc is value', () => {
      model.set([collectionName, docId], value)
      model.del(collectionName, docId, field)

      let newDoc = model.get(collectionName, docId)
      assert(typeof newDoc === 'object')
      assert.equal(Object.keys(newDoc).length, 1)
    })

    it('should set when array', async () => {
      await model.add(collectionName, getDocData())
      let newValue = 'Vasya'

      model.set([collectionName, docId, field], newValue)

      let name = model.get(collectionName, docId, field)
      assert.equal(name, newValue)
    })

    it('should set when path', async () => {
      await model.add(collectionName, getDocData())
      let newValue = 'Vasya'

      model.set(`${collectionName}.${docId}.${field}`, newValue)

      let name = model.get(collectionName, docId, field)
      assert.equal(name, newValue)
    })

    it('should set doc', () => {
      model.set([collectionName, docId], getDocData())

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

    it('should set value on field when doc is value', () => {
      model.set([collectionName, docId], value)
      model.set([collectionName, docId, field], value)

      let newDoc = model.get(collectionName, docId)
      assert.equal(newDoc[field], value)
    })

    it('should set on empty doc', () => {
      model.set([collectionName, docId, field], value)

      let name = model.get(collectionName, docId, field)
      assert.equal(name, value)
    })

    it('should increment when array', async () => {
      await model.add(collectionName, getDocData())

      model.increment([collectionName, docId, field], numValue)

      let name = model.get(collectionName, docId, field)
      assert.equal(name, numValue)
    })

    it('should increment when path', async () => {
      await model.add(collectionName, getDocData())

      model.increment(`${collectionName}.${docId}.${field}`, numValue)

      let name = model.get(collectionName, docId, field)
      assert.equal(name, numValue)
    })

    it('should increment doc', () => {
      model.increment([collectionName, docId], numValue)

      let newDoc = model.get(collectionName, docId)
      assert.equal(newDoc, numValue)
    })

    it('should increment value as doc on local collection', () => {
      model.increment([localCollectionName, docId], numValue)

      let newDoc = model.get(localCollectionName, docId)
      assert.equal(newDoc, numValue)
      let collectionData = model.get(localCollectionName)
      assert.equal(collectionData[docId], numValue)
    })

    it('should increment value as doc on local collection when not array', () => {
      model.increment(`${collectionName}.${docId}`, numValue)

      let newDoc = model.get(`${collectionName}.${docId}`)
      assert.equal(newDoc, numValue)
      let collectionData = model.get(collectionName)
      assert.equal(collectionData[docId], numValue)
    })

    it('should increment on empty doc', () => {
      model.increment([collectionName, docId, field], numValue)

      let name = model.get(collectionName, docId, field)
      assert.equal(name, numValue)
    })

    it('should increment value on field when doc is value', () => {
      model.set([collectionName, docId], value)
      model.increment([collectionName, docId, field], numValue)

      let newDoc = model.get(collectionName, docId)
      assert.equal(newDoc[field], numValue)
    })

    it('should stringInsert when array', async () => {
      await model.add(collectionName, getDocData())

      model.stringInsert([collectionName, docId, field], 0, value)

      let name = model.get(collectionName, docId, field)
      assert.equal(name, value)
    })

    it('should stringInsert when path', async () => {
      await model.add(collectionName, getDocData())

      model.stringInsert(`${collectionName}.${docId}.${field}`, 0, value)

      let name = model.get(collectionName, docId, field)
      assert.equal(name, value)
    })

    it('should stringInsert doc', () => {
      model.stringInsert([collectionName, docId], 0, value)

      let newDoc = model.get(collectionName, docId)
      assert.equal(newDoc, value)
    })

    it('should stringInsert value as doc on local collection', () => {
      model.stringInsert([localCollectionName, docId], 0, value)

      let newDoc = model.get(localCollectionName, docId)
      assert.equal(newDoc, value)
      let collectionData = model.get(localCollectionName)
      assert.equal(collectionData[docId], value)
    })

    it('should stringInsert value as doc on local collection when not array', () => {
      model.stringInsert(`${collectionName}.${docId}`, 0, value)

      let newDoc = model.get(`${collectionName}.${docId}`)
      assert.equal(newDoc, value)
      let collectionData = model.get(collectionName)
      assert.equal(collectionData[docId], value)
    })

    it('should stringInsert on empty doc', () => {
      model.stringInsert([collectionName, docId, field], 0, value)

      let name = model.get(collectionName, docId, field)
      assert.equal(name, value)
    })

    it('should stringInsert some times', () => {
      model.stringInsert([collectionName, docId, field], 0, 'df')
      model.stringInsert([collectionName, docId, field], 0, 'a')
      model.stringInsert([collectionName, docId, field], 1, 's')

      let name = model.get(collectionName, docId, field)
      assert.equal(name, 'asdf')
    })

    it('should stringInsert value on field when doc is value', () => {
      model.set([collectionName, docId], value)
      model.stringInsert([collectionName, docId, field], 0, 'a')

      let newDoc = model.get(collectionName, docId)
      assert.equal(newDoc[field], 'a')
    })

    it('should stringRemove doc', () => {
      model.stringInsert([collectionName, docId], 0, value)
      model.stringRemove([collectionName, docId], 0, 2)

      let newDoc = model.get(collectionName, docId)
      assert.equal(newDoc, 'an')
    })

    it('should stringRemove value as doc on local collection', () => {
      model.stringInsert([localCollectionName, docId], 0, value)
      model.stringRemove([localCollectionName, docId], 0, 2)

      let newDoc = model.get(localCollectionName, docId)
      assert.equal(newDoc, 'an')
      let collectionData = model.get(localCollectionName)
      assert.equal(collectionData[docId], 'an')
    })

    it('should stringRemove value as doc on local collection when not array', () => {
      model.stringInsert([collectionName, docId], 0, value)
      model.stringRemove(`${collectionName}.${docId}`, 0, 2)

      let newDoc = model.get(`${collectionName}.${docId}`)
      assert.equal(newDoc, 'an')
      let collectionData = model.get(collectionName)
      assert.equal(collectionData[docId], 'an')
    })

    it('should stringRemove on empty doc', () => {
      model.stringRemove([collectionName, docId, field], 0, 1)

      let name = model.get(collectionName, docId, field)
      assert.equal(name, undefined)
    })

    it('should stringRemove some times', () => {
      model.stringInsert([collectionName, docId, field], 0, value)
      model.stringRemove([collectionName, docId, field], 1, 1)
      model.stringRemove([collectionName, docId, field], 2, 1)
      model.stringRemove([collectionName, docId, field], 0, 1)

      let name = model.get(collectionName, docId, field)
      assert.equal(name, 'a')
    })

    it('should stringRemove value on field when doc is value', () => {
      model.set([collectionName, docId], value)
      model.stringRemove([collectionName, docId, field], 0, 1)

      let newDoc = model.get(collectionName, docId)
      // stringRemove does not create op
      assert.equal(newDoc[field], undefined)
    })

    it('should stringDiff when array', async () => {
      await model.add(collectionName, getDocData())

      model.stringDiff([collectionName, docId, field], value)

      let name = model.get(collectionName, docId, field)
      assert.equal(name, value)
    })

    it('should stringDiff when path', async () => {
      await model.add(collectionName, getDocData())

      model.stringDiff(`${collectionName}.${docId}.${field}`, value)

      let name = model.get(collectionName, docId, field)
      assert.equal(name, value)
    })

    it('should stringDiff doc', () => {
      model.stringDiff([collectionName, docId], '1Ivan2')
      model.stringDiff([collectionName, docId], value)

      let newDoc = model.get(collectionName, docId)
      assert.equal(newDoc, value)
    })

    it('should stringDiff value as doc', () => {
      model.stringDiff([collectionName, docId], value)

      let newDoc = model.get(collectionName, docId)
      assert.equal(newDoc, value)
    })

    it('should stringDiff value as doc on local collection', () => {
      model.stringDiff([localCollectionName, docId], value)

      let newDoc = model.get(localCollectionName, docId)
      assert.equal(newDoc, value)
      let collectionData = model.get(localCollectionName)
      assert.equal(collectionData[docId], value)
    })

    it('should stringDiff value as doc on local collection when not array', () => {
      model.stringDiff(`${collectionName}.${docId}`, value)

      let newDoc = model.get(`${collectionName}.${docId}`)
      assert.equal(newDoc, value)
      let collectionData = model.get(collectionName)
      assert.equal(collectionData[docId], value)
    })

    it('should stringDiff on empty doc', () => {
      model.stringDiff([collectionName, docId, field], value)

      let name = model.get(collectionName, docId, field)
      assert.equal(name, value)
    })

    it('should stringDiff value on field when doc is value', () => {
      model.set([collectionName, docId], value)
      model.stringDiff([collectionName, docId, field], value)

      let newDoc = model.get(collectionName, docId)
      assert.equal(newDoc[field], value)
    })

    it('should stringDiff some times', () => {
      model.stringDiff([collectionName, docId, field], 'asdf')
      model.stringDiff([collectionName, docId, field], 'asfd')
      model.stringDiff([collectionName, docId, field], 'asafd')
      model.stringDiff([collectionName, docId, field], 'asdffdasd as df asdfasdf')
      model.stringDiff([collectionName, docId, field], 'fdassdfasdf asd fasdf a sdf')
      model.stringDiff([collectionName, docId, field], 'a sdfa sdfasdfasdf asd f asdf')
      model.stringDiff([collectionName, docId, field], 'asdas d fasdfasdf asd fa sdf')
      model.stringDiff([collectionName, docId, field], 'asadfa sd fasdfasdfasd fasdfas')
      model.stringDiff([collectionName, docId, field], 'asdf')

      let name = model.get(collectionName, docId, field)
      assert.equal(name, 'asdf')
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

    it('should create several sync ops with different timestamp', () => {
      let opData = {
        type: 'test'
      }

      let op = model.createOp(opData)
      let op2 = model.createOp(opData)
      let op3 = model.createOp(opData)

      assert(op.date !== op2.date !== op3.date)
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
      channel.open()
    })

    it('should send op on add', () => {
      return new Promise((resolve, reject) => {
        channel.send = (op) => {
          assert(op)
          assert.equal(op.type, 'add')
          resolve()
        }

        model.add(collectionName, getDocData())
      })
    })

    it('should send op on set', () => {
      return new Promise((resolve, reject) => {
        channel.send = (op) => {
          assert(op)
          assert.equal(op.type, 'set')
          resolve()
        }

        model.set([collectionName, docId], value)
      })
    })

    it('should send op on set field', () => {
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

    it('should send op on increment', () => {
      return new Promise((resolve, reject) => {
        channel.send = (op) => {
          assert(op)
          assert.equal(op.type, 'increment')
          resolve()
        }

        model.increment([collectionName, docId], numValue)
      })
    })

    it('should send op on increment field', () => {
      return new Promise((resolve, reject) => {
        channel.send = (op) => {
          assert(op)
          assert.equal(op.type, 'increment')
          resolve()
        }

        model.increment([collectionName, docId, field], numValue)
      })
    })
  })

  describe('subscribes', () => {
    beforeEach(() => {
      channel = new ServerChannel()
      model = new Model(channel, 'test')
    })

    it('should fetch doc when no array', async () => {
      await model.fetch(collectionName, docId)
    })

    it('should fetch doc when path', async () => {
      await model.fetch(`${collectionName}.${docId}`)
    })

    it('should fetch doc when array', async () => {
      await model.fetch([collectionName, docId])
    })

    it('should fetch doc when array of arrays', async () => {
      await model.fetch([[collectionName, docId]])
    })

    it('should fetch doc when doc', async () => {
      let doc = model.doc(collectionName, docId)
      await model.fetch(doc)
    })

    it('should fetch doc when array of docs', async () => {
      let doc = model.doc(collectionName, docId)
      await model.fetch([doc])
    })

    it('should subscribe doc when no array', async () => {
      await model.subscribe(collectionName, docId)
    })

    it('should subscribe doc when path', async () => {
      await model.subscribe(`${collectionName}.${docId}`)
    })

    it('should subscribe doc when array', async () => {
      await model.subscribe([collectionName, docId])
    })

    it('should subscribe doc when array of arrays', async () => {
      await model.subscribe([[collectionName, docId]])
    })

    it('should subscribe doc when doc', async () => {
      let doc = model.doc(collectionName, docId)
      await model.subscribe(doc)
    })

    it('should subscribe doc when array of docs', async () => {
      let doc = model.doc(collectionName, docId)
      await model.subscribe([doc])
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
