import assert from 'assert'
import Model from '../../../../src/client/Model'
import ServerChannel from '../../../../src/server/ServerChannel'
import { collectionName, docId, field } from '../../../util'

let channel
let model
let value = {insert: 'Gandalf', attributes: {bold: true}}

describe('Model mutators rich', () => {
  beforeEach(() => {
    channel = new ServerChannel()
    model = new Model({channel})
  })

  it('should rich when args as array', () => {
    model.rich([collectionName, docId, field], value)

    assert.deepEqual(model.get(collectionName, docId, field), [value])
  })

  it('should rich when args as path', () => {
    model.rich(`${collectionName}.${docId}.${field}`, value)

    assert.deepEqual(model.get(collectionName, docId, field), [value])
  })

  it('should rich doc', () => {
    model.rich([collectionName, docId], value)

    assert.deepEqual(model.get(collectionName, docId), [value])
  })

  it('should rich when value', () => {
    model.set([collectionName, docId, field], value)
    model.rich([collectionName, docId, field], value)

    assert.deepEqual(model.get(collectionName, docId, field), [value])
  })

  it('should rich some times', () => {
    model.rich([collectionName, docId, field], value)
    model.rich([collectionName, docId, field], value)
    model.rich([collectionName, docId, field], value)

    assert.deepEqual(model.get(collectionName, docId, field), [value, value, value])
  })

  it('should rich value on field when doc is value', () => {
    model.set([collectionName, docId], value)
    model.rich([collectionName, docId, field], value)

    assert.deepEqual(model.get(collectionName, docId, field), [value])
  })
})
