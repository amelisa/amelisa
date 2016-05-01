import assert from 'assert'
import Doc from '../../../src/client/Doc'
import Model from '../../../src/client/Model'
import ServerChannel from '../../../src/server/ServerChannel'
import { source, source2, collectionName, docId, field, value } from '../../util'

let channel
let model

describe('Doc general', () => {
  beforeEach(() => {
    channel = new ServerChannel()
    model = new Model({channel, source})
  })

  it('should get undefined from empty doc', () => {
    let doc = new Doc(docId)

    assert.equal(doc.get(), undefined)
  })

  it('should get docId from empty doc', () => {
    let doc = new Doc(docId)

    assert.equal(doc.get('_id'), docId)
  })

  it('should get undefined field from empty doc', () => {
    let doc = new Doc(docId)

    assert.equal(doc.get('no_field'), undefined)
  })

  it('should get doc data', () => {
    let op = model.createOp({
      type: 'add',
      collectionName,
      docId,
      value: {
        [field]: value
      }
    })

    let doc = new Doc(docId, [op])

    let docData = doc.get()
    assert.equal(JSON.stringify(docData), JSON.stringify({[field]: value, _id: docId}))

    assert.equal(doc.get(field), value)
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

  it('should get field that is array', () => {
    let op = model.createOp({
      type: 'add',
      collectionName,
      docId,
      value: {
        [field]: [value]
      }
    })

    let doc = new Doc(docId, [op])

    assert.deepEqual(doc.get(field), [value])
    assert(Array.isArray(doc.get(field)))
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

  it('should getMapFromVersion from different sources', () => {
    let date1 = Date.now()
    let date2 = Date.now() + 1

    let doc = new Doc(docId)
    let map = doc.getMapFromVersion(`${source} ${date1}|${source2} ${date2}`)

    assert.equal(Object.keys(map).length, 2)
    assert.equal(map[source], date1)
    assert.equal(map[source2], date2)
  })

  it('should getMapFromVersion from one sources', () => {
    let date1 = Date.now()

    let doc = new Doc(docId)
    let map = doc.getMapFromVersion(`${source} ${date1}`)

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
