import assert from 'assert'
import Model from '../../../../src/client/Model'
import ServerChannel from '../../../../src/server/ServerChannel'
import { source, collectionName, localCollectionName, docId, field, value, value2, getDocData } from '../../../util'

let channel
let model

describe('Model mutators general', () => {
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
    model.add(collectionName, {[field]: value})

    let newId = Object.keys(model.get(collectionName))[0]

    assert.deepEqual(model.get(collectionName, newId), {_id: newId, [field]: value})
  })

  it('should add with docId', () => {
    model.add(collectionName, getDocData())

    assert.deepEqual(model.get(collectionName, docId), {_id: docId, [field]: value})
  })

  it('should del doc', () => {
    model.add(collectionName, getDocData())

    model.del(collectionName, docId)

    assert.equal(model.get(collectionName, docId), undefined)
  })

  it('should del doc when args as array', () => {
    model.add(collectionName, getDocData())

    model.del([collectionName, docId])

    assert.equal(model.get(collectionName, docId), undefined)
  })

  it('should del doc when args as path', () => {
    model.add(collectionName, getDocData())

    model.del(`${collectionName}.${docId}`)

    assert.equal(model.get(collectionName, docId), undefined)
  })

  it('should del field', () => {
    model.add(collectionName, getDocData())

    model.del(collectionName, docId, field)

    assert.deepEqual(model.get(collectionName, docId), {_id: docId})
  })

  it('should del field when args as array', () => {
    model.add(collectionName, getDocData())

    model.del([collectionName, docId, field])

    assert.deepEqual(model.get(collectionName, docId), {_id: docId})
  })

  it('should del field when args as path', () => {
    model.add(collectionName, getDocData())

    model.del(`${collectionName}.${docId}.${field}`)

    assert.deepEqual(model.get(collectionName, docId), {_id: docId})
  })

  it('should del value on field when doc is value', () => {
    model.set([collectionName, docId], value)

    model.del(collectionName, docId, field)

    assert.deepEqual(model.get(collectionName, docId), {_id: docId})
  })

  it('should set doc', () => {
    model.set([collectionName, docId], getDocData())

    assert.deepEqual(model.get(collectionName, docId), {_id: docId, [field]: value})
  })

  it('should set doc when args as path', () => {
    model.set(`${collectionName}.${docId}`, getDocData())

    assert.deepEqual(model.get(collectionName, docId), {_id: docId, [field]: value})
  })

  it('should set value as doc', () => {
    model.set([collectionName, docId], value)

    assert.deepEqual(model.get(collectionName, docId), value)
  })

  it('should set value as doc on local collection', () => {
    model.set([localCollectionName, docId], value)

    assert.deepEqual(model.get(localCollectionName, docId), value)
  })

  it('should set value as doc on local collection when args as path', () => {
    model.set(`${collectionName}.${docId}`, value)

    assert.deepEqual(model.get(collectionName, docId), value)
  })

  it('should set when args as array', () => {
    model.add(collectionName, getDocData())

    model.set([collectionName, docId, field], value2)

    assert.equal(model.get(collectionName, docId, field), value2)
  })

  it('should set when args as path', () => {
    model.add(collectionName, getDocData())

    model.set(`${collectionName}.${docId}.${field}`, value2)

    assert.equal(model.get(collectionName, docId, field), value2)
  })

  it('should set field when doc is value', () => {
    model.set([collectionName, docId], value)
    model.set([collectionName, docId, field], value)

    assert.equal(model.get(collectionName, docId, field), value)
  })

  it('should set on empty doc', () => {
    model.set([collectionName, docId, field], value)

    assert.equal(model.get(collectionName, docId, field), value)
  })
})
