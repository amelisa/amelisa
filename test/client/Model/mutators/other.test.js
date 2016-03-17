import assert from 'assert'
import Model from '../../../../src/client/Model'
import ServerChannel from '../../../../src/server/ServerChannel'
import { source, collectionName, docId, field, numValue } from '../../../util'

let channel
let model

describe('Model mutators other', () => {
  beforeEach(() => {
    channel = new ServerChannel()
    model = new Model(channel, source)
  })

  it('should invert when args as array', () => {
    model.invert([collectionName, docId, field])

    assert.equal(model.get(collectionName, docId, field), true)
  })

  it('should invert when args as path', () => {
    model.invert(`${collectionName}.${docId}.${field}`)

    assert.equal(model.get(collectionName, docId, field), true)
  })

  it('should invert doc', () => {
    model.invert([collectionName, docId])

    assert.equal(model.get(collectionName, docId), true)
  })

  it('should invert true', () => {
    model.set([collectionName, docId, field], true)
    model.invert([collectionName, docId, field])

    assert.equal(model.get(collectionName, docId, field), false)
  })

  it('should increment when args as array', () => {
    model.increment([collectionName, docId, field], numValue)

    assert.equal(model.get(collectionName, docId, field), numValue)
  })

  it('should increment when args as path', () => {
    model.increment(`${collectionName}.${docId}.${field}`, numValue)

    assert.equal(model.get(collectionName, docId, field), numValue)
  })

  it('should increment doc', () => {
    model.increment([collectionName, docId], numValue)

    assert.equal(model.get(collectionName, docId), numValue)
  })

  it('should increment number', () => {
    model.set([collectionName, docId, field], numValue)
    model.increment([collectionName, docId, field], numValue)

    assert.equal(model.get(collectionName, docId, field), numValue + numValue)
  })
})
