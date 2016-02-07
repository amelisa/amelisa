import assert from 'assert'
import Doc from '../src/Doc'
import { source, collectionName, docId, field, value } from './util'

let source2 = 'source2'

describe('Doc', () => {
  it('should get fields from empty doc', () => {
    let doc = new Doc(docId)

    assert.equal(doc.get(), undefined)
    assert.equal(doc.get('_id'), docId)
    assert.equal(doc.get('no_field'), undefined)
  })

  it('should get field', () => {
    let ops = []
    let lastDate = Date.now()

    let op = {
      id: 'id',
      source: source,
      type: 'add',
      date: lastDate,
      collectionName: collectionName,
      docId: docId,
      value: {
        [field]: value
      }
    }
    ops.push(op)

    let doc = new Doc(docId, ops)

    assert.equal(doc.get(field), value)
  })

  it('should get field that not exists', () => {
    let ops = []
    let lastDate = Date.now()

    let op = {
      id: 'id',
      source: source,
      type: 'add',
      date: lastDate,
      collectionName: collectionName,
      docId: docId,
      value: {}
    }
    ops.push(op)

    let doc = new Doc(docId, ops)

    assert.equal(doc.get('notexists.name'), undefined)
  })

  it('should get nested field', () => {
    let ops = []
    let lastDate = Date.now()

    let op = {
      id: 'id',
      source: source,
      type: 'add',
      date: lastDate,
      collectionName: collectionName,
      docId: docId,
      value: {
        nested: {
          [field]: value
        }
      }
    }
    ops.push(op)

    let doc = new Doc(docId, ops)

    assert.equal(doc.get('nested.name'), value)
  })

  it('should distillOps on same field', () => {
    let ops = []
    let lastDate = Date.now()

    let op = {
      id: 'id',
      source: source,
      type: 'add',
      date: lastDate,
      collectionName: collectionName,
      docId: docId,
      value: {
        [field]: value
      }
    }
    ops.push(op)

    for (let i = 0; i < 10; i++) {
      lastDate = Date.now()
      op = {
        id: 'id' + i,
        source: source,
        type: 'set',
        date: lastDate + i + 1,
        collectionName: collectionName,
        docId: docId,
        field: field,
        value: 'Ivan'
      }
      ops.push(op)
    }

    let doc = new Doc(docId, ops)
    doc.distillOps()

    assert.equal(doc.ops.length, 2)
    assert.equal(doc.ops[1].date, lastDate + 10)
  })

  it('should distillOps on same docId if no fields', () => {
    let ops = []
    let lastDate = Date.now()

    let op = {
      id: 'id',
      source: source,
      type: 'add',
      date: lastDate,
      collectionName: collectionName,
      docId: docId,
      value: {
        [field]: value
      }
    }
    ops.push(op)

    for (let i = 0; i < 10; i++) {
      lastDate = Date.now()
      op = {
        id: 'id' + i,
        source: source,
        type: 'set',
        date: lastDate + i + 1,
        collectionName: collectionName,
        docId: docId,
        value: 'Ivan'
      }
      ops.push(op)
    }

    let doc = new Doc(docId, ops)
    doc.distillOps()

    assert.equal(doc.ops.length, 2)
    assert.equal(doc.ops[1].date, lastDate + 10)
  })

  it('should refreshState on different field', () => {
    let ops = []

    let op = {
      source: source,
      type: 'add',
      date: Date.now(),
      collectionName: collectionName,
      docId: docId,
      value: {
        [field]: value
      }
    }
    ops.push(op)

    op = {
      source: source,
      type: 'set',
      date: Date.now(),
      collectionName: collectionName,
      docId: docId,
      field: 'age',
      value: 10
    }
    ops.push(op)

    let doc = new Doc(docId, ops)

    assert.equal(doc.get('_id'), docId)
    assert.equal(doc.get(field), value)
    assert.equal(doc.get('age'), 10)
    assert.equal(Object.keys(doc.get()).length, 3)
  })

  it('should distillOps on nested field', () => {
    let ops = []
    let lastDate = Date.now()

    let op = {
      id: 'id',
      source: source,
      type: 'add',
      date: lastDate,
      collectionName: collectionName,
      docId: docId,
      value: {
        nested: {
          [field]: value
        }
      }
    }
    ops.push(op)

    op = {
      id: 'id1',
      source: source,
      type: 'set',
      date: lastDate + 1,
      collectionName: collectionName,
      docId: docId,
      field: 'nested.' + field,
      value: 'Ivan'
    }
    ops.push(op)

    op = {
      id: 'id2',
      source: source,
      type: 'set',
      date: lastDate + 2,
      collectionName: collectionName,
      docId: docId,
      field: 'nested',
      value: 'Ivan'
    }
    ops.push(op)

    let doc = new Doc(docId, ops)
    doc.distillOps()

    assert.equal(doc.ops.length, 2)
    assert.equal(doc.ops[1].date, lastDate + 2)
  })

  it('should not distillOps on nested field after field', () => {
    let ops = []
    let lastDate = Date.now()

    let op = {
      id: 'id',
      source: source,
      type: 'add',
      date: lastDate,
      collectionName: collectionName,
      docId: docId,
      value: {
        nested: {
          [field]: value
        }
      }
    }
    ops.push(op)

    op = {
      id: 'id1',
      source: source,
      type: 'set',
      date: lastDate + 1,
      collectionName: collectionName,
      docId: docId,
      field: 'nested',
      value: 'Ivan'
    }
    ops.push(op)

    op = {
      id: 'id2',
      source: source,
      type: 'set',
      date: lastDate + 2,
      collectionName: collectionName,
      docId: docId,
      field: 'nested.' + field,
      value: 'Ivan'
    }
    ops.push(op)

    let doc = new Doc(docId, ops)
    doc.distillOps()

    assert.equal(doc.ops.length, 3)
    assert.equal(doc.ops[2].date, lastDate + 2)
  })

  it('should refreshState on same field', () => {
    let ops = []

    let op = {
      source: source,
      type: 'add',
      date: Date.now(),
      collectionName: collectionName,
      docId: docId,
      value: {
        [field]: value
      }
    }
    ops.push(op)

    op = {
      source: source,
      type: 'set',
      date: Date.now(),
      collectionName: collectionName,
      docId: docId,
      field: field,
      value: 'Vasya'
    }
    ops.push(op)

    let doc = new Doc(docId, ops)

    assert.equal(doc.get('_id'), docId)
    assert.equal(doc.get(field), 'Vasya')
    assert.equal(Object.keys(doc.get()).length, 2)
  })

  it('should refreshState with nested field', () => {
    let ops = []

    let op = {
      source: source,
      type: 'add',
      date: Date.now(),
      collectionName: collectionName,
      docId: docId,
      value: {
        nested: {
          [field]: value
        }
      }
    }
    ops.push(op)

    op = {
      source: source,
      type: 'set',
      date: Date.now(),
      collectionName: collectionName,
      docId: docId,
      field: 'nested.' + field,
      value: 'Vasya'
    }
    ops.push(op)

    let doc = new Doc(docId, ops)

    assert.equal(doc.get('_id'), docId)
    assert.equal(doc.get('nested.' + field), 'Vasya')
    assert.equal(Object.keys(doc.get()).length, 2)
  })

  it('should refreshState when del', () => {
    let ops = []

    let op = {
      source: source,
      type: 'add',
      date: Date.now(),
      collectionName: collectionName,
      docId: docId,
      value: {
        [field]: value
      }
    }
    ops.push(op)

    op = {
      source: source,
      type: 'del',
      date: Date.now(),
      collectionName: collectionName,
      docId: docId
    }
    ops.push(op)

    let doc = new Doc(docId, ops)

    assert.equal(doc.get('_id'), undefined)
    assert.equal(doc.get(field), undefined)
    assert.equal(doc.get(), undefined)
  })

  it('should refreshState with field del', () => {
    let ops = []

    let op = {
      source: source,
      type: 'add',
      date: Date.now(),
      collectionName: collectionName,
      docId: docId,
      value: {
        nested: {
          [field]: value
        }
      }
    }
    ops.push(op)

    op = {
      source: source,
      type: 'del',
      date: Date.now(),
      collectionName: collectionName,
      docId: docId,
      field: 'nested'
    }
    ops.push(op)

    let doc = new Doc(docId, ops)

    assert.equal(doc.get('_id'), docId)
    assert.equal(doc.get('nested'), undefined)
    assert.equal(Object.keys(doc.get()).length, 1)
  })

  it('should refreshState with nested field del', () => {
    let ops = []

    let op = {
      source: source,
      type: 'add',
      date: Date.now(),
      collectionName: collectionName,
      docId: docId,
      value: {
        nested: {
          [field]: value
        }
      }
    }
    ops.push(op)

    op = {
      source: source,
      type: 'del',
      date: Date.now(),
      collectionName: collectionName,
      docId: docId,
      field: 'nested.' + field
    }
    ops.push(op)

    let doc = new Doc(docId, ops)

    assert.equal(doc.get('_id'), docId)
    assert.equal(typeof doc.get('nested'), 'object')
    assert.equal(Object.keys(doc.get('nested')).length, 0)
    assert.equal(doc.get('nested.' + field), undefined)
    assert.equal(Object.keys(doc.get()).length, 2)
  })

  it('should getVersionFromOps from different sources', () => {
    let ops = []
    let date1 = Date.now()
    let date2 = Date.now() + 1

    let op = {
      source: source,
      type: 'add',
      date: date1,
      collectionName: collectionName,
      docId: docId,
      value: {
        [field]: value
      }
    }
    ops.push(op)

    op = {
      source: source2,
      type: 'set',
      date: date2,
      collectionName: collectionName,
      docId: docId,
      field: field,
      value: 'Ivan'
    }
    ops.push(op)

    let doc = new Doc(docId)
    let version = doc.getVersionFromOps(ops)

    assert.equal(version, `${source} ${date1}|${source2} ${date2}`)
  })

  it('should getVersionFromOps from same sources', () => {
    let ops = []
    let date1 = Date.now()
    let date2 = Date.now() + 1

    let op = {
      source: source,
      type: 'add',
      date: date1,
      collectionName: collectionName,
      docId: docId,
      value: {
        [field]: value
      }
    }
    ops.push(op)

    op = {
      source: source,
      type: 'set',
      date: date2,
      collectionName: collectionName,
      docId: docId,
      field: field,
      value: 'Ivan'
    }
    ops.push(op)

    let doc = new Doc(docId)
    let version = doc.getVersionFromOps(ops)

    assert.equal(version, `${source} ${date2}`)
  })

  it('should versionMap from different sources', () => {
    let date1 = Date.now()
    let date2 = Date.now() + 1

    let doc = new Doc(docId)
    let map = doc.versionMap(`${source} ${date1}|${source2} ${date2}`)

    assert.equal(Object.keys(map).length, 2)
    assert.equal(map[source], date1)
    assert.equal(map[source2], date2)
  })

  it('should versionMap from one sources', () => {
    let date1 = Date.now()

    let doc = new Doc(docId)
    let map = doc.versionMap(`${source} ${date1}`)

    assert.equal(Object.keys(map).length, 1)
    assert.equal(map[source], date1)
  })

  it('should getOpsToSend', () => {
    let ops = []
    let date1 = Date.now()
    let date2 = Date.now() + 1

    let op = {
      source: source,
      type: 'add',
      date: date1,
      collectionName: collectionName,
      docId: docId,
      value: {
        [field]: value
      }
    }
    ops.push(op)

    op = {
      source: source,
      type: 'set',
      date: date2,
      collectionName: collectionName,
      docId: docId,
      field: field,
      value: 'Ivan'
    }
    ops.push(op)

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
