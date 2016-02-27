import assert from 'assert'
import eventToPromise from 'event-to-promise'
import { MemoryStorage, Store } from '../../src/server'
import { collectionName, docId, field, value } from '../util'

let store
let model

describe('hooks', () => {
  beforeEach(async () => {
    let storage = new MemoryStorage()
    await storage.init()

    store = new Store(storage)
    model = store.createModel()
  })

  it('should call hooks', (done) => {
    let preHookCalled = false
    store.preHook = async (op, session, params) => {
      if (op.type !== 'add') return

      assert(op)
      assert(!session)
      assert(params)
      assert(params.server)
      preHookCalled = true
    }

    store.afterHook = async (op, session, params) => {
      assert(preHookCalled)

      assert(op)
      assert.equal(op.type, 'add')
      assert(!session)
      assert(params)
      assert(params.server)

      done()
    }

    let doc = {
      _id: docId,
      [field]: value
    }
    model.add(collectionName, doc)
  })
})
