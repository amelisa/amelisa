import assert from 'assert'
import ClientQuery from '../../../src/client/ClientQuery'
import Model from '../../../src/client/Model'
import ServerChannel from '../../../src/server/ServerChannel'
import { dbQueries } from '../../../src/mongo'
import { source, collectionName, field, value, sleep } from '../../util'

let channel
let model

describe('Model other', () => {
  beforeEach(() => {
    channel = new ServerChannel()
    model = new Model({channel, source, dbQueries})
    model.online = true
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
    assert(op.source)
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

  it('should sync date', async () => {
    let start = Date.now()
    await sleep(10)
    let serverDate = Date.now()
    await sleep(10)
    model.syncDate(start, serverDate)

    let dateDiff = model.get('_app.dateDiff')

    assert(typeof dateDiff === 'number')
    assert(dateDiff >= -3)
    assert(dateDiff <= 3)
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
