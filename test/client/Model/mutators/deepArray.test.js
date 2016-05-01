import assert from 'assert'
import Model from '../../../../src/client/Model'
import ServerChannel from '../../../../src/server/ServerChannel'
import { collectionName, docId, field, value, value2 } from '../../../util'

let channel
let model

describe('Model mutators deep array', () => {
  beforeEach(() => {
    channel = new ServerChannel()
    model = new Model({channel})
  })

  it('should set on item', () => {
    model.push([collectionName, docId, field], {[field]: value})
    model.push([collectionName, docId, field], {[field]: value})
    model.set([collectionName, docId, `${field}.1.${field}`], value2)

    assert.deepEqual(model.get(collectionName, docId, field), [{[field]: value}, {[field]: value2}])
  })

  it('should set on index', () => {
    model.push([collectionName, docId, field], {[field]: value})
    model.push([collectionName, docId, field], {[field]: value})
    model.set([collectionName, docId, `${field}.1`], value2)

    assert.deepEqual(model.get(collectionName, docId, field), [{[field]: value}, value2])
  })

  it('should not set on empty index', (done) => {
    model.push([collectionName, docId, field], {[field]: value})
    model.push([collectionName, docId, field], {[field]: value})
    model.set([collectionName, docId, `${field}.2`], value2)
      .catch((err) => err && done())
  })

  it('should del on item', () => {
    model.push([collectionName, docId, field], {[field]: value})
    model.push([collectionName, docId, field], {[field]: value})
    model.del(collectionName, docId, `${field}.1.${field}`)

    assert.deepEqual(model.get(collectionName, docId, field), [{[field]: value}, {}])
  })

  it('should del on index', () => {
    model.push([collectionName, docId, field], {[field]: value})
    model.push([collectionName, docId, field], {[field]: value})
    model.del(collectionName, docId, `${field}.1`)

    assert.deepEqual(model.get(collectionName, docId, field), [{[field]: value}])
  })

  it('should not del on empty index', (done) => {
    model.push([collectionName, docId, field], {[field]: value})
    model.push([collectionName, docId, field], {[field]: value})
    model.del(collectionName, docId, `${field}.2`)
      .catch((err) => err && done())
  })

  it('should push on item', () => {
    model.push([collectionName, docId, field], {[field]: value})
    model.push([collectionName, docId, field], {[field]: value})
    model.push([collectionName, docId, `${field}.1.${field}`], value2)

    assert.deepEqual(model.get(collectionName, docId, field), [{[field]: value}, {[field]: [value2]}])
  })

  it('should get on array by index', () => {
    model.push([collectionName, docId, field], {[field]: value})

    assert.deepEqual(model.get(collectionName, docId, `${field}.0`), {[field]: value})
  })
})
