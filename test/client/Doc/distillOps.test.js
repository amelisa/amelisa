import assert from 'assert'
import Doc from '../../../src/client/Doc'
import Model from '../../../src/client/Model'
import ServerChannel from '../../../src/server/ServerChannel'
import { source, collectionName, docId, field, value } from '../../util'

let channel
let model

describe('Doc distillOps', () => {
  beforeEach(() => {
    channel = new ServerChannel()
    model = new Model(channel, source)
  })

  it('should distillOps on same field', () => {
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

    for (let i = 0; i <= 10; i++) {
      let op = model.createOp({
        type: 'set',
        collectionName,
        docId,
        field,
        value: value + i
      })
      ops.push(op)
    }

    let doc = new Doc(docId, ops)
    doc.distillOps()

    assert.equal(doc.ops.length, 2)
    assert.equal(doc.ops[1].value, value + 10)
  })

  it('should distillOps on doc when last set', () => {
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
      value
    })
    ops.push(op)

    let doc = new Doc(docId, ops)
    doc.distillOps()

    assert.equal(doc.ops.length, 1)
    assert.equal(doc.ops[0].value, value)
  })

  it('should distillOps on doc when last add', () => {
    let ops = []

    let op = model.createOp({
      type: 'set',
      collectionName,
      docId,
      value
    })
    ops.push(op)

    op = model.createOp({
      type: 'add',
      collectionName,
      docId,
      value: {
        [field]: value
      }
    })
    ops.push(op)

    let doc = new Doc(docId, ops)
    doc.distillOps()

    assert.equal(doc.ops.length, 1)
    assert.equal(doc.ops[0].value[field], value)
  })

  it('should distillOps on doc when set after increment', () => {
    let ops = []

    let op = model.createOp({
      type: 'increment',
      collectionName,
      docId,
      value: 4
    })
    ops.push(op)

    op = model.createOp({
      type: 'set',
      collectionName,
      docId,
      value
    })
    ops.push(op)

    let doc = new Doc(docId, ops)
    doc.distillOps()

    assert.equal(doc.ops.length, 1)
    assert.equal(doc.ops[0].value, value)
  })

  it('should distillOps on doc when set before increment', () => {
    let ops = []

    let op = model.createOp({
      type: 'set',
      collectionName,
      docId,
      value
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
    doc.distillOps()

    assert.equal(doc.ops.length, 2)
    assert.equal(doc.ops[1].value, 4)
  })

  it('should distillOps on same field when set after increment', () => {
    let ops = []

    let op = model.createOp({
      type: 'increment',
      collectionName,
      docId,
      field,
      value: 4
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
    doc.distillOps()

    assert.equal(doc.ops.length, 1)
    assert.equal(doc.ops[0].value, value)
  })

  it('should distillOps on same field when set before increment', () => {
    let ops = []

    let op = model.createOp({
      type: 'set',
      collectionName,
      docId,
      field,
      value
    })
    ops.push(op)

    op = model.createOp({
      type: 'increment',
      collectionName,
      docId,
      field,
      value: 4
    })
    ops.push(op)

    let doc = new Doc(docId, ops)
    doc.distillOps()

    assert.equal(doc.ops.length, 2)
    assert.equal(doc.ops[1].value, 4)
  })

  it('should distillOps on doc when set after stringInsert', () => {
    let ops = []

    let op = model.createOp({
      type: 'stringInsert',
      collectionName,
      docId,
      charId: model.id(),
      value: 'a'
    })
    ops.push(op)

    op = model.createOp({
      type: 'set',
      collectionName,
      docId,
      value: value
    })
    ops.push(op)

    let doc = new Doc(docId, ops)
    doc.distillOps()

    assert.equal(doc.ops.length, 1)
    assert.equal(doc.ops[0].value, value)
  })

  it('should distillOps on doc when set before stringInsert', () => {
    let ops = []

    let op = model.createOp({
      type: 'set',
      collectionName,
      docId,
      value
    })
    ops.push(op)

    op = model.createOp({
      type: 'stringInsert',
      collectionName,
      docId,
      charId: model.id(),
      value: 'a'
    })
    ops.push(op)

    let doc = new Doc(docId, ops)
    doc.distillOps()

    assert.equal(doc.ops.length, 2)
    assert.equal(doc.ops[1].value, 'a')
  })

  it('should distillOps on same field when set after stringInsert', () => {
    let ops = []

    let op = model.createOp({
      type: 'stringInsert',
      collectionName,
      docId,
      field,
      charId: model.id(),
      value: 'a'
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
    doc.distillOps()

    assert.equal(doc.ops.length, 1)
    assert.equal(doc.ops[0].value, value)
  })

  it('should distillOps on same field when set before stringInsert', () => {
    let ops = []

    let op = model.createOp({
      type: 'set',
      collectionName,
      docId,
      field,
      value
    })
    ops.push(op)

    op = model.createOp({
      type: 'stringInsert',
      collectionName,
      docId,
      field,
      charId: model.id(),
      value: 'a'
    })
    ops.push(op)

    let doc = new Doc(docId, ops)
    doc.distillOps()

    assert.equal(doc.ops.length, 2)
    assert.equal(doc.ops[1].value, 'a')
  })

  it('should distillOps on doc when set after stringRemove', () => {
    let ops = []

    let op = model.createOp({
      type: 'stringRemove',
      collectionName,
      docId,
      positionId: model.id()
    })
    ops.push(op)

    op = model.createOp({
      type: 'set',
      collectionName,
      docId,
      value
    })
    ops.push(op)

    let doc = new Doc(docId, ops)
    doc.distillOps()

    assert.equal(doc.ops.length, 1)
    assert.equal(doc.ops[0].value, value)
  })

  it('should distillOps on doc when set before stringRemove', () => {
    let ops = []

    let op = model.createOp({
      type: 'set',
      collectionName,
      docId,
      value
    })
    ops.push(op)

    op = model.createOp({
      type: 'stringRemove',
      collectionName,
      docId,
      positionId: model.id()
    })
    ops.push(op)

    let doc = new Doc(docId, ops)
    doc.distillOps()

    assert.equal(doc.ops.length, 2)
    assert.equal(doc.ops[1].type, 'stringRemove')
  })

  it('should distillOps on same field when set after stringRemove', () => {
    let ops = []

    let op = model.createOp({
      type: 'stringRemove',
      collectionName,
      docId,
      field,
      positionId: model.id()
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
    doc.distillOps()

    assert.equal(doc.ops.length, 1)
    assert.equal(doc.ops[0].value, value)
  })

  it('should distillOps on same field when set before stringRemove', () => {
    let ops = []

    let op = model.createOp({
      type: 'set',
      collectionName,
      docId,
      field,
      value
    })
    ops.push(op)

    op = model.createOp({
      type: 'stringRemove',
      collectionName,
      docId,
      field,
      positionId: model.id()
    })
    ops.push(op)

    let doc = new Doc(docId, ops)
    doc.distillOps()

    assert.equal(doc.ops.length, 2)
    assert.equal(doc.ops[1].type, 'stringRemove')
  })

  it('should distillOps on same docId if no fields', () => {
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

    for (let i = 0; i <= 10; i++) {
      let op = model.createOp({
        type: 'set',
        collectionName,
        docId,
        field,
        value: value + i
      })
      ops.push(op)
    }

    let doc = new Doc(docId, ops)
    doc.distillOps()

    assert.equal(doc.ops.length, 2)
    assert.equal(doc.ops[1].value, value + 10)
  })

  it('should distillOps on nested field', () => {
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
      value
    })
    ops.push(op)

    op = model.createOp({
      type: 'set',
      collectionName,
      docId,
      field: 'nested',
      value
    })
    ops.push(op)

    let doc = new Doc(docId, ops)
    doc.distillOps()

    assert.equal(doc.ops.length, 2)
    assert.equal(doc.ops[1].field, 'nested')
  })

  it('should not distillOps on nested field after field', () => {
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
      field: 'nested',
      value
    })
    ops.push(op)

    op = model.createOp({
      type: 'set',
      collectionName,
      docId,
      field: `nested.${field}`,
      value
    })
    ops.push(op)

    let doc = new Doc(docId, ops)
    doc.distillOps()

    assert.equal(doc.ops.length, 3)
    assert.equal(doc.ops[2].field, `nested.${field}`)
  })
})
