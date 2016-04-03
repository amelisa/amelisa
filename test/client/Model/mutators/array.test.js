import assert from 'assert'
import Model from '../../../../src/client/Model'
import ServerChannel from '../../../../src/server/ServerChannel'
import { collectionName, localCollectionName, docId, field, value, value2, arrayValue, getDocData } from '../../../util'

let channel
let model

describe('Model mutators array', () => {
  beforeEach(() => {
    channel = new ServerChannel()
    model = new Model(channel)
  })

  it('should push when args as array', () => {
    model.push([collectionName, docId, field], value)

    assert.deepEqual(model.get(collectionName, docId, field), [value])
  })

  it('should push when args as path', () => {
    model.push(`${collectionName}.${docId}.${field}`, value)

    assert.deepEqual(model.get(collectionName, docId, field), [value])
  })

  it('should push doc', () => {
    model.push([collectionName, docId], value)

    assert.deepEqual(model.get(collectionName, docId), [value])
  })

  it('should push on array', () => {
    model.set([collectionName, docId, field], [value])
    model.push([collectionName, docId, field], value2)

    assert.deepEqual(model.get(collectionName, docId, field), [value, value2])
  })

  it('should unshift when args as array', () => {
    model.unshift([collectionName, docId, field], value)

    assert.deepEqual(model.get(collectionName, docId, field), [value])
  })

  it('should unshift when args as path', () => {
    model.unshift(`${collectionName}.${docId}.${field}`, value)

    assert.deepEqual(model.get(collectionName, docId, field), [value])
  })

  it('should unshift doc', () => {
    model.unshift([collectionName, docId], value)

    assert.deepEqual(model.get(collectionName, docId), [value])
  })

  it('should unshift on array', () => {
    model.set([collectionName, docId, field], [value])
    model.unshift([collectionName, docId, field], value2)

    assert.deepEqual(model.get(collectionName, docId, field), [value2, value])
  })

  it('should pop when args as array', () => {
    model.pop([collectionName, docId, field])

    assert.deepEqual(model.get(collectionName, docId, field), [])
  })

  it('should pop when args as path', () => {
    model.pop(`${collectionName}.${docId}.${field}`)

    assert.deepEqual(model.get(collectionName, docId, field), [])
  })

  it('should pop doc', () => {
    model.pop([collectionName, docId])

    assert.deepEqual(model.get(collectionName, docId), [])
  })

  it('should pop on array', () => {
    model.set([collectionName, docId, field], [value, value2])
    model.pop([collectionName, docId, field])

    assert.deepEqual(model.get(collectionName, docId, field), [value])
  })

  it('should shift when args as array', () => {
    model.shift([collectionName, docId, field])

    assert.deepEqual(model.get(collectionName, docId, field), [])
  })

  it('should shift when args as path', () => {
    model.shift(`${collectionName}.${docId}.${field}`)

    assert.deepEqual(model.get(collectionName, docId, field), [])
  })

  it('should shift doc', () => {
    model.shift([collectionName, docId])

    assert.deepEqual(model.get(collectionName, docId), [])
  })

  it('should shift on array', () => {
    model.set([collectionName, docId, field], [value, value2])
    model.shift([collectionName, docId, field])

    assert.deepEqual(model.get(collectionName, docId, field), [value2])
  })

  it('should insert when args as array', () => {
    model.insert([collectionName, docId, field], 0, value)

    assert.deepEqual(model.get(collectionName, docId, field), [value])
  })

  it('should insert when args as path', () => {
    model.insert(`${collectionName}.${docId}.${field}`, 0, value)

    assert.deepEqual(model.get(collectionName, docId, field), [value])
  })

  it('should insert doc', () => {
    model.insert([collectionName, docId], 0, value)

    assert.deepEqual(model.get(collectionName, docId), [value])
  })

  it('should insert on array', () => {
    model.set([collectionName, docId, field], [value])
    model.insert([collectionName, docId, field], 1, value2)

    assert.deepEqual(model.get(collectionName, docId, field), [value, value2])
  })

  it('should remove when args as array', () => {
    model.remove([collectionName, docId, field], 0, 1)

    assert.deepEqual(model.get(collectionName, docId, field), [])
  })

  it('should remove when args as path', () => {
    model.remove(`${collectionName}.${docId}.${field}`, 0, 1)

    assert.deepEqual(model.get(collectionName, docId, field), [])
  })

  it('should remove doc', () => {
    model.remove([collectionName, docId], 0, 1)

    assert.deepEqual(model.get(collectionName, docId), [])
  })

  it('should remove on array', () => {
    model.set([collectionName, docId, field], [value, value2])
    model.remove([collectionName, docId, field], 1, 1)

    assert.deepEqual(model.get(collectionName, docId, field), [value])
  })

  it('should move when args as array', () => {
    model.move([collectionName, docId, field], 0, 1)

    assert.deepEqual(model.get(collectionName, docId, field), [])
  })

  it('should move when args as path', () => {
    model.move(`${collectionName}.${docId}.${field}`, 0, 1)

    assert.deepEqual(model.get(collectionName, docId, field), [])
  })

  it('should move doc', () => {
    model.move([collectionName, docId], 0, 1)

    assert.deepEqual(model.get(collectionName, docId), [])
  })

  it('should move on array when two items', () => {
    model.set([collectionName, docId, field], [value, value2])
    model.move([collectionName, docId, field], 0, 1)

    assert.deepEqual(model.get(collectionName, docId, field), [value2, value])
  })

  it('should move to zero index', () => {
    model.set([collectionName, docId, field], [1, 2, 3])
    model.move([collectionName, docId, field], 1, 0)

    assert.deepEqual(model.get(collectionName, docId, field), [2, 1, 3])
  })

  it('should move some values', () => {
    model.set([collectionName, docId, field], [1, 2, 3])
    model.move([collectionName, docId, field], 1, 0, 2)

    assert.deepEqual(model.get(collectionName, docId, field), [2, 3, 1])
  })

  it('should move from zero index', () => {
    model.set([collectionName, docId, field], [1, 2, 3])
    model.move([collectionName, docId, field], 0, 2)

    assert.deepEqual(model.get(collectionName, docId, field), [2, 3, 1])
  })

  it('should swap when args as array', () => {
    model.swap([collectionName, docId, field], 0, 1)

    assert.deepEqual(model.get(collectionName, docId, field), [])
  })

  it('should swap when args as path', () => {
    model.swap(`${collectionName}.${docId}.${field}`, 0, 1)

    assert.deepEqual(model.get(collectionName, docId, field), [])
  })

  it('should swap doc', () => {
    model.swap([collectionName, docId], 0, 1)

    assert.deepEqual(model.get(collectionName, docId), [])
  })

  it('should swap on array when two items', () => {
    model.set([collectionName, docId, field], [value, value2])
    model.swap([collectionName, docId, field], 0, 1)

    assert.deepEqual(model.get(collectionName, docId, field), [value2, value])
  })

  it('should swap to zero index', () => {
    model.set([collectionName, docId, field], [1, 2, 3])
    model.swap([collectionName, docId, field], 1, 0)

    assert.deepEqual(model.get(collectionName, docId, field), [2, 1, 3])
  })

  it('should swap from zero index', () => {
    model.set([collectionName, docId, field], [1, 2, 3])
    model.swap([collectionName, docId, field], 0, 2)

    assert.deepEqual(model.get(collectionName, docId, field), [3, 2, 1])
  })

  it('should arrayDiff when args as array', () => {
    model.add(collectionName, getDocData())

    model.arrayDiff([collectionName, docId, field], arrayValue)

    assert.deepEqual(model.get(collectionName, docId, field), arrayValue)
  })

  it('should arrayDiff when args as path', () => {
    model.add(collectionName, getDocData())

    model.arrayDiff(`${collectionName}.${docId}.${field}`, arrayValue)

    assert.deepEqual(model.get(collectionName, docId, field), arrayValue)
  })

  it('should arrayDiff doc', () => {
    model.arrayDiff([collectionName, docId], '1Ivan2')
    model.arrayDiff([collectionName, docId], arrayValue)

    assert.deepEqual(model.get(collectionName, docId), arrayValue)
  })

  it('should arrayDiff value as doc', () => {
    model.arrayDiff([collectionName, docId], arrayValue)

    assert.deepEqual(model.get(collectionName, docId), arrayValue)
  })

  it('should arrayDiff value as doc on local collection', () => {
    model.arrayDiff([localCollectionName, docId], arrayValue)

    assert.deepEqual(model.get(localCollectionName, docId), arrayValue)
  })

  it('should arrayDiff value as doc on local collection when args as path', () => {
    model.arrayDiff(`${collectionName}.${docId}`, arrayValue)

    assert.deepEqual(model.get(collectionName, docId), arrayValue)
  })

  it('should arrayDiff on empty doc', () => {
    model.arrayDiff([collectionName, docId, field], arrayValue)

    assert.deepEqual(model.get(collectionName, docId, field), arrayValue)
  })

  it('should arrayDiff value on field when doc is value', () => {
    model.set([collectionName, docId], value)
    model.arrayDiff([collectionName, docId, field], arrayValue)

    assert.deepEqual(model.get(collectionName, docId, field), arrayValue)
  })

  it('should arrayDiff some times', () => {
    model.arrayDiff([collectionName, docId, field], [1, 2, 3])
    model.arrayDiff([collectionName, docId, field], [2, 1, 3])
    model.arrayDiff([collectionName, docId, field], [2, 2, 1])
    model.arrayDiff([collectionName, docId, field], [2, 2, 1, 1, 1])
    model.arrayDiff([collectionName, docId, field], [1, 1, 2, 2, 1])
    model.arrayDiff([collectionName, docId, field], [3, 2, 1, 2])
    model.arrayDiff([collectionName, docId, field], [1, 2, 3])
    model.arrayDiff([collectionName, docId, field], [2, 1])
    model.arrayDiff([collectionName, docId, field], arrayValue)

    assert.deepEqual(model.get(collectionName, docId, field), arrayValue)
  })
})
