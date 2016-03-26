import assert from 'assert'
import Model from '../../../../src/client/Model'
import ServerChannel from '../../../../src/server/ServerChannel'
import { collectionName, docId, field, value } from '../../../util'

let channel
let model

describe('Model mutators string', () => {
  beforeEach(() => {
    channel = new ServerChannel()
    model = new Model(channel)
  })

  it('should stringInsert when args as array', () => {
    model.stringInsert([collectionName, docId, field], 0, value)

    assert.equal(model.get(collectionName, docId, field), value)
  })

  it('should stringInsert when args as path', () => {
    model.stringInsert(`${collectionName}.${docId}.${field}`, 0, value)

    assert.equal(model.get(collectionName, docId, field), value)
  })

  it('should stringInsert doc', () => {
    model.stringInsert([collectionName, docId], 0, value)

    assert.equal(model.get(collectionName, docId), value)
  })

  it('should stringInsert on string', () => {
    model.set([collectionName, docId, field], value)
    model.stringInsert([collectionName, docId, field], 0, value)

    assert.equal(model.get(collectionName, docId, field), value + value)
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

  it('should stringRemove when args as array', () => {
    model.stringInsert([collectionName, docId, field], 0, value)
    model.stringRemove([collectionName, docId, field], 0, 2)

    assert.equal(model.get(collectionName, docId, field), 'an')
  })

  it('should stringRemove when args as path', () => {
    model.stringInsert([collectionName, docId, field], 0, value)
    model.stringRemove(`${collectionName}.${docId}.${field}`, 0, 2)

    assert.equal(model.get(collectionName, docId, field), 'an')
  })

  it('should stringRemove doc', () => {
    model.stringInsert([collectionName, docId], 0, value)
    model.stringRemove([collectionName, docId], 0, 2)

    assert.equal(model.get(collectionName, docId), 'an')
  })

  it('should stringRemove on string', () => {
    model.set([collectionName, docId, field], value)
    model.stringRemove([collectionName, docId, field], 0, 2)

    assert.equal(model.get(collectionName, docId, field), 'an')
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
    model.stringDiff([collectionName, docId, field], value)

    assert.equal(model.get(collectionName, docId, field), value)
  })

  it('should stringDiff when args as path', () => {
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
