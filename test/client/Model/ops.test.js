import assert from 'assert'
import Model from '../../../src/client/Model'
import ServerChannel from '../../../src/server/ServerChannel'
import { collectionName, docId, field, value, numValue, getDocData } from '../../util'

let channel
let model

describe('Model ops', () => {
  beforeEach(() => {
    channel = new ServerChannel()
    model = new Model(channel)
    channel.open()
  })

  it('should send op on add', () => {
    return new Promise((resolve, reject) => {
      channel.send = (op) => {
        assert(op)
        assert.equal(op.type, 'add')
        resolve()
      }

      model.add(collectionName, getDocData())
    })
  })

  it('should send op on set', () => {
    return new Promise((resolve, reject) => {
      channel.send = (op) => {
        assert(op)
        assert.equal(op.type, 'set')
        resolve()
      }

      model.set([collectionName, docId], value)
    })
  })

  it('should send op on set field', () => {
    return new Promise((resolve, reject) => {
      channel.send = (op) => {
        assert(op)
        assert.equal(op.type, 'set')
        resolve()
      }

      model.set([collectionName, docId, field], value)
    })
  })

  it('should send op on del doc', () => {
    return new Promise((resolve, reject) => {
      channel.send = (op) => {
        assert(op)
        assert.equal(op.type, 'del')
        resolve()
      }

      model.del([collectionName, docId])
    })
  })

  it('should send op on del field', () => {
    return new Promise((resolve, reject) => {
      channel.send = (op) => {
        assert(op)
        assert.equal(op.type, 'del')
        resolve()
      }

      model.del([collectionName, docId, field])
    })
  })

  it('should send op on increment', () => {
    return new Promise((resolve, reject) => {
      channel.send = (op) => {
        assert(op)
        assert.equal(op.type, 'increment')
        resolve()
      }

      model.increment([collectionName, docId], numValue)
    })
  })

  it('should send op on increment field', () => {
    return new Promise((resolve, reject) => {
      channel.send = (op) => {
        assert(op)
        assert.equal(op.type, 'increment')
        resolve()
      }

      model.increment([collectionName, docId, field], numValue)
    })
  })
})
