import assert from 'assert'
import Model from '../../../src/client/Model'
import ServerChannel from '../../../src/server/ServerChannel'
import { source, collectionName, localCollectionName, docId, field, value, value2, numValue, getDocData } from '../../util'

let channel
let model

describe('Model mutators', () => {
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

  it('should increment when args as array', () => {
    model.add(collectionName, getDocData())

    model.increment([collectionName, docId, field], numValue)

    assert.equal(model.get(collectionName, docId, field), numValue)
  })

  it('should increment when args as path', () => {
    model.add(collectionName, getDocData())

    model.increment(`${collectionName}.${docId}.${field}`, numValue)

    assert.equal(model.get(collectionName, docId, field), numValue)
  })

  it('should increment doc', () => {
    model.increment([collectionName, docId], numValue)

    assert.equal(model.get(collectionName, docId), numValue)
  })

  it('should increment value as doc on local collection', () => {
    model.increment([localCollectionName, docId], numValue)

    assert.equal(model.get(localCollectionName, docId), numValue)
  })

  it('should increment value as doc on local collection when args as path', () => {
    model.increment(`${collectionName}.${docId}`, numValue)

    assert.equal(model.get(collectionName, docId), numValue)
  })

  it('should increment on empty doc', () => {
    model.increment([collectionName, docId, field], numValue)

    assert.equal(model.get(collectionName, docId, field), numValue)
  })

  it('should increment value on field when doc is value', () => {
    model.set([collectionName, docId], value)
    model.increment([collectionName, docId, field], numValue)

    assert.equal(model.get(collectionName, docId, field), numValue)
  })

  it('should stringInsert when args as array', () => {
    model.add(collectionName, getDocData())

    model.stringInsert([collectionName, docId, field], 0, value)

    assert.equal(model.get(collectionName, docId, field), value + value)
  })

  it('should stringInsert when args as path', () => {
    model.add(collectionName, getDocData())

    model.stringInsert(`${collectionName}.${docId}.${field}`, 0, value)

    assert.equal(model.get(collectionName, docId, field), value + value)
  })

  it('should stringInsert doc', () => {
    model.stringInsert([collectionName, docId], 0, value)

    assert.equal(model.get(collectionName, docId), value)
  })

  it('should stringInsert value as doc on local collection', () => {
    model.stringInsert([localCollectionName, docId], 0, value)

    assert.equal(model.get(localCollectionName, docId), value)
  })

  it('should stringInsert value as doc on local collection when args as path', () => {
    model.stringInsert(`${collectionName}.${docId}`, 0, value)

    assert.equal(model.get(collectionName, docId), value)
  })

  it('should stringInsert on empty doc', () => {
    model.stringInsert([collectionName, docId, field], 0, value)

    assert.equal(model.get(collectionName, docId, field), value)
  })

  it('should stringInsert some times', () => {
    model.stringInsert([collectionName, docId, field], 0, 'df')
    model.stringInsert([collectionName, docId, field], 0, 'a')
    model.stringInsert([collectionName, docId, field], 1, 's')

    assert.equal(model.get(collectionName, docId, field), 'asdf')
  })

  it('should stringInsert value on field when doc is value', () => {
    model.set([collectionName, docId], value)
    model.stringInsert([collectionName, docId, field], 0, 'a')

    assert.equal(model.get(collectionName, docId, field), 'a')
  })

  it('should stringRemove doc', () => {
    model.stringInsert([collectionName, docId], 0, value)
    model.stringRemove([collectionName, docId], 0, 2)

    assert.equal(model.get(collectionName, docId), 'an')
  })

  it('should stringRemove value as doc on local collection', () => {
    model.stringInsert([localCollectionName, docId], 0, value)
    model.stringRemove([localCollectionName, docId], 0, 2)

    assert.equal(model.get(localCollectionName, docId), 'an')
  })

  it('should stringRemove value as doc on local collection when args as path', () => {
    model.stringInsert([collectionName, docId], 0, value)
    model.stringRemove(`${collectionName}.${docId}`, 0, 2)

    assert.equal(model.get(collectionName, docId), 'an')
  })

  it('should stringRemove on empty doc', () => {
    model.stringRemove([collectionName, docId, field], 0, 1)

    assert.equal(model.get(collectionName, docId, field), '')
  })

  it('should stringRemove some times', () => {
    model.stringInsert([collectionName, docId, field], 0, value)
    model.stringRemove([collectionName, docId, field], 1, 1)
    model.stringRemove([collectionName, docId, field], 2, 1)
    model.stringRemove([collectionName, docId, field], 0, 1)

    assert.equal(model.get(collectionName, docId, field), 'a')
  })

  it('should stringRemove value on field when doc is value', () => {
    model.set([collectionName, docId], value)
    model.stringRemove([collectionName, docId, field], 0, 1)

    assert.equal(model.get(collectionName, docId, field), '')
  })

  it('should stringDiff when args as array', () => {
    model.add(collectionName, getDocData())

    model.stringDiff([collectionName, docId, field], value)

    assert.equal(model.get(collectionName, docId, field), value)
  })

  it('should stringDiff when args as path', () => {
    model.add(collectionName, getDocData())

    model.stringDiff(`${collectionName}.${docId}.${field}`, value)

    assert.equal(model.get(collectionName, docId, field), value)
  })

  it('should stringDiff doc', () => {
    model.stringDiff([collectionName, docId], '1Ivan2')
    model.stringDiff([collectionName, docId], value)

    assert.equal(model.get(collectionName, docId), value)
  })

  it('should stringDiff value as doc', () => {
    model.stringDiff([collectionName, docId], value)

    assert.equal(model.get(collectionName, docId), value)
  })

  it('should stringDiff value as doc on local collection', () => {
    model.stringDiff([localCollectionName, docId], value)

    assert.equal(model.get(localCollectionName, docId), value)
  })

  it('should stringDiff value as doc on local collection when args as path', () => {
    model.stringDiff(`${collectionName}.${docId}`, value)

    assert.equal(model.get(collectionName, docId), value)
  })

  it('should stringDiff on empty doc', () => {
    model.stringDiff([collectionName, docId, field], value)

    assert.equal(model.get(collectionName, docId, field), value)
  })

  it('should stringDiff value on field when doc is value', () => {
    model.set([collectionName, docId], value)
    model.stringDiff([collectionName, docId, field], value)

    assert.equal(model.get(collectionName, docId, field), value)
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

    assert.equal(model.get(collectionName, docId, field), 'asdf')
  })
})
