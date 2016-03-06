import assert from 'assert'
import Doc from '../../src/client/Doc'
import Model from '../../src/client/Model'
import ServerChannel from '../../src/server/ServerChannel'
import { source, source2, collectionName, docId, field, field2, value, value2 } from '../util'

let channel
let model

describe('Doc', () => {
  beforeEach(() => {
    channel = new ServerChannel()
    model = new Model(channel, source)
  })

  it('should get fields from empty doc', () => {
    let doc = new Doc(docId)

    assert.equal(doc.get(), undefined)
    assert.equal(doc.get('_id'), docId)
    assert.equal(doc.get('no_field'), undefined)
  })

  it('should get field', () => {
    let op = model.createOp({
      type: 'add',
      collectionName,
      docId,
      value: {
        [field]: value
      }
    })

    let doc = new Doc(docId, [op])

    assert.equal(doc.get(field), value)
  })

  it('should get field that not exists', () => {
    let op = model.createOp({
      type: 'add',
      collectionName,
      docId,
      value: {}
    })

    let doc = new Doc(docId, [op])

    assert.equal(doc.get('notexists.name'), undefined)
  })

  it('should get nested field', () => {
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

    let doc = new Doc(docId, [op])

    assert.equal(doc.get(`nested.${field}`), value)
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
      charId: model.id(),
      value: 1
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
      charId: model.id(),
      value: 1
    })
    ops.push(op)

    let doc = new Doc(docId, ops)
    doc.distillOps()

    assert.equal(doc.ops.length, 2)
    assert.equal(doc.ops[1].value, 1)
  })

  it('should distillOps on same field when set after stringRemove', () => {
    let ops = []

    let op = model.createOp({
      type: 'stringRemove',
      collectionName,
      docId,
      field,
      charId: model.id(),
      value: 1
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
      charId: model.id(),
      value: 1
    })
    ops.push(op)

    let doc = new Doc(docId, ops)
    doc.distillOps()

    assert.equal(doc.ops.length, 2)
    assert.equal(doc.ops[1].value, 1)
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

    op = model.createOp({
      type: 'stringInsert',
      collectionName,
      docId,
      value: 'a',
      charId: model.id()
    })
    ops.push(op)

    op = model.createOp({
      type: 'stringRemove',
      collectionName,
      docId,
      value: 1
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

    op = model.createOp({
      type: 'stringInsert',
      collectionName,
      docId,
      field,
      value: 'a',
      charId: model.id()
    })
    ops.push(op)

    op = model.createOp({
      type: 'stringRemove',
      collectionName,
      docId,
      field,
      value: 1
    })
    ops.push(op)

    let doc = new Doc(docId, ops)

    assert.equal(doc.get('_id'), docId)
    assert.equal(doc.get(field), '')
  })

  it('should getVersionFromOps from different sources', () => {
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
    let date1 = op.date

    op = model.createOp({
      type: 'set',
      collectionName,
      docId,
      field,
      value
    })
    op.source = source2
    ops.push(op)
    let date2 = op.date

    let doc = new Doc(docId)
    let version = doc.getVersionFromOps(ops)

    assert.equal(version, `${source} ${date1}|${source2} ${date2}`)
  })

  it('should getVersionFromOps from same sources', () => {
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
      field,
      value
    })
    ops.push(op)
    let date2 = op.date

    let doc = new Doc(docId)
    let version = doc.getVersionFromOps(ops)

    assert.equal(version, `${source} ${date2}`)
  })

  it('should getVersionMap from different sources', () => {
    let date1 = Date.now()
    let date2 = Date.now() + 1

    let doc = new Doc(docId)
    let map = doc.getVersionMap(`${source} ${date1}|${source2} ${date2}`)

    assert.equal(Object.keys(map).length, 2)
    assert.equal(map[source], date1)
    assert.equal(map[source2], date2)
  })

  it('should getVersionMap from one sources', () => {
    let date1 = Date.now()

    let doc = new Doc(docId)
    let map = doc.getVersionMap(`${source} ${date1}`)

    assert.equal(Object.keys(map).length, 1)
    assert.equal(map[source], date1)
  })

  it('should getOpsToSend', () => {
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
    let date1 = op.date

    op = model.createOp({
      type: 'set',
      collectionName,
      docId,
      field,
      value
    })
    ops.push(op)
    let date2 = op.date

    let doc = new Doc(docId, ops)

    let opsToSend = doc.getOpsToSend(`${source} ${date2}`)
    assert.equal(opsToSend.length, 0)

    opsToSend = doc.getOpsToSend(`${source} ${date1}`)
    assert.equal(opsToSend.length, 1)

    opsToSend = doc.getOpsToSend(`${source} ${date1 - 1}`)
    assert.equal(opsToSend.length, 2)

    opsToSend = doc.getOpsToSend(`${source2} ${date1}`)
    assert.equal(opsToSend.length, 2)

    opsToSend = doc.getOpsToSend()
    assert.equal(opsToSend.length, 2)
  })
})
