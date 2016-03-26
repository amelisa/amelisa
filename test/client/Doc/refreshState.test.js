import assert from 'assert'
import Doc from '../../../src/client/Doc'
import Model from '../../../src/client/Model'
import ServerChannel from '../../../src/server/ServerChannel'
import { collectionName, docId, field, field2, value, value2 } from '../../util'

let channel
let model

describe('Doc refreshState', () => {
  beforeEach(() => {
    channel = new ServerChannel()
    model = new Model(channel)
  })

  it('should refreshState on different field', () => {
    let ops = []

    let op = model.createOp({
      type: 'add',
      collectionName,
      docId,
      value: {
        [field]: value
      }
    })
    ops.push(op)

    op = model.createOp({
      type: 'set',
      collectionName,
      docId,
      field: field2,
      value: value2
    })
    ops.push(op)

    let doc = new Doc(docId, ops)

    assert.equal(doc.get('_id'), docId)
    assert.equal(doc.get(field), value)
    assert.equal(doc.get(field2), value2)
    assert.equal(Object.keys(doc.get()).length, 3)
  })

  it('should refreshState on same field', () => {
    let ops = []

    let op = model.createOp({
      type: 'add',
      collectionName,
      docId,
      value: {
        [field]: value
      }
    })
    ops.push(op)

    op = model.createOp({
      type: 'set',
      collectionName,
      docId,
      field,
      value: value2
    })
    ops.push(op)

    let doc = new Doc(docId, ops)

    assert.equal(doc.get('_id'), docId)
    assert.equal(doc.get(field), value2)
    assert.equal(Object.keys(doc.get()).length, 2)
  })

  it('should refreshState with nested field', () => {
    let ops = []

    let op = model.createOp({
      type: 'add',
      collectionName,
      docId,
      value: {
        nested: {
          [field]: value
        }
      }
    })
    ops.push(op)

    op = model.createOp({
      type: 'set',
      collectionName,
      docId,
      field: `nested.${field}`,
      value: value2
    })
    ops.push(op)

    let doc = new Doc(docId, ops)

    assert.equal(doc.get('_id'), docId)
    assert.equal(doc.get(`nested.${field}`), value2)
    assert.equal(Object.keys(doc.get()).length, 2)
  })

  it('should refreshState when del', () => {
    let ops = []

    let op = model.createOp({
      type: 'add',
      collectionName,
      docId,
      value: {
        [field]: value
      }
    })
    ops.push(op)

    op = model.createOp({
      type: 'del',
      collectionName,
      docId
    })
    ops.push(op)

    let doc = new Doc(docId, ops)

    assert.equal(doc.get('_id'), undefined)
    assert.equal(doc.get(field), undefined)
    assert.equal(doc.get(), undefined)
  })

  it('should refreshState when set after del', () => {
    let ops = []

    let op = model.createOp({
      type: 'add',
      collectionName,
      docId,
      value: {
        [field]: value
      }
    })
    ops.push(op)

    op = model.createOp({
      type: 'del',
      collectionName,
      docId
    })
    ops.push(op)

    op = model.createOp({
      type: 'set',
      collectionName,
      docId,
      field,
      value
    })
    ops.push(op)

    let doc = new Doc(docId, ops)

    assert.equal(doc.get('_id'), docId)
    assert.equal(doc.get(field), value)
  })

  it('should refreshState with field del', () => {
    let ops = []

    let op = model.createOp({
      type: 'add',
      collectionName,
      docId,
      value: {
        nested: {
          [field]: value
        }
      }
    })
    ops.push(op)

    op = model.createOp({
      type: 'del',
      collectionName,
      docId,
      field: 'nested'
    })
    ops.push(op)

    let doc = new Doc(docId, ops)

    assert.equal(doc.get('_id'), docId)
    assert.equal(doc.get('nested'), undefined)
    assert.equal(Object.keys(doc.get()).length, 1)
  })

  it('should refreshState with nested field del', () => {
    let ops = []

    let op = model.createOp({
      type: 'add',
      collectionName,
      docId,
      value: {
        nested: {
          [field]: value
        }
      }
    })
    ops.push(op)

    op = model.createOp({
      type: 'del',
      collectionName,
      docId,
      field: `nested.${field}`
    })
    ops.push(op)

    let doc = new Doc(docId, ops)

    assert.equal(doc.get('_id'), docId)
    assert.equal(typeof doc.get('nested'), 'object')
    assert.equal(Object.keys(doc.get('nested')).length, 0)
    assert.equal(doc.get('nested.' + field), undefined)
    assert.equal(Object.keys(doc.get()).length, 2)
  })

  it('should refreshState when increment', () => {
    let ops = []

    let op = model.createOp({
      type: 'add',
      collectionName,
      docId,
      value: 3
    })
    ops.push(op)

    op = model.createOp({
      type: 'increment',
      collectionName,
      docId,
      value: 4
    })
    ops.push(op)

    let doc = new Doc(docId, ops)

    assert.equal(doc.get('_id'), docId)
    assert.equal(doc.get(field), undefined)
    assert.equal(doc.get(), 7)
  })

  it('should refreshState when increment when no value', () => {
    let ops = []

    let op = model.createOp({
      type: 'add',
      collectionName,
      docId,
      value: 3
    })
    ops.push(op)

    op = model.createOp({
      type: 'increment',
      collectionName,
      docId
    })
    ops.push(op)

    let doc = new Doc(docId, ops)

    assert.equal(doc.get('_id'), docId)
    assert.equal(doc.get(field), undefined)
    assert.equal(doc.get(), 4)
  })

  it('should refreshState when increment and not number', () => {
    let ops = []

    let op = model.createOp({
      type: 'add',
      collectionName,
      docId,
      value: {
        [field]: value
      }
    })
    ops.push(op)

    op = model.createOp({
      type: 'increment',
      collectionName,
      docId,
      value: 4
    })
    ops.push(op)

    let doc = new Doc(docId, ops)

    assert.equal(doc.get('_id'), docId)
    assert.equal(doc.get(field), undefined)
    assert.equal(doc.get(), 4)
  })

  it('should refreshState when field increment', () => {
    let ops = []

    let op = model.createOp({
      type: 'add',
      collectionName,
      docId,
      value: {
        [field]: 2
      }
    })
    ops.push(op)

    op = model.createOp({
      type: 'increment',
      collectionName,
      docId,
      field,
      value: 3
    })
    ops.push(op)

    let doc = new Doc(docId, ops)

    assert.equal(doc.get('_id'), docId)
    assert.equal(doc.get(field), 5)
  })

  it('should refreshState when stringInsert', () => {
    let ops = []

    let op = model.createOp({
      type: 'add',
      collectionName,
      docId,
      value: {
        [field]: value
      }
    })
    ops.push(op)

    op = model.createOp({
      type: 'stringInsert',
      collectionName,
      docId,
      value: 'a',
      charId: model.id()
    })
    ops.push(op)

    let doc = new Doc(docId, ops)

    assert.equal(doc.get('_id'), docId)
    assert.equal(doc.get(), 'a')
  })

  it('should refreshState when stringInsert and stringRemove', () => {
    let ops = []

    let op = model.createOp({
      type: 'add',
      collectionName,
      docId,
      value: {
        [field]: value
      }
    })
    ops.push(op)

    let charId = model.id()
    op = model.createOp({
      type: 'stringInsert',
      collectionName,
      docId,
      value: 'a',
      charId
    })
    ops.push(op)

    op = model.createOp({
      type: 'stringRemove',
      collectionName,
      docId,
      positionId: charId
    })
    ops.push(op)

    let doc = new Doc(docId, ops)

    assert.equal(doc.get('_id'), docId)
    assert.equal(doc.get(), '')
  })

  it('should refreshState when field stringInsert', () => {
    let ops = []

    let op = model.createOp({
      type: 'add',
      collectionName,
      docId,
      value: {
        [field]: value
      }
    })
    ops.push(op)

    op = model.createOp({
      type: 'stringInsert',
      collectionName,
      docId,
      field,
      value: 'a',
      charId: model.id()
    })
    ops.push(op)

    let doc = new Doc(docId, ops)

    assert.equal(doc.get('_id'), docId)
    assert.equal(doc.get(field), 'a')
  })

  it('should refreshState when field stringInsert and stringRemove', () => {
    let ops = []

    let op = model.createOp({
      type: 'add',
      collectionName,
      docId,
      value: {
        [field]: value
      }
    })
    ops.push(op)

    let charId = model.id()
    op = model.createOp({
      type: 'stringInsert',
      collectionName,
      docId,
      field,
      value: 'a',
      charId
    })
    ops.push(op)

    op = model.createOp({
      type: 'stringRemove',
      collectionName,
      docId,
      field,
      positionId: charId
    })
    ops.push(op)

    let doc = new Doc(docId, ops)

    assert.equal(doc.get('_id'), docId)
    assert.equal(doc.get(field), '')
  })
})
