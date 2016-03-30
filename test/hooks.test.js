import assert from 'assert'
import { MemoryStorage } from '../src/mongo/server'
import { Store } from '../src/server'
import { collectionName, docId, field, value, getDocData } from './util'

let store
let model

describe('hooks', () => {
  beforeEach(async () => {
    let storage = new MemoryStorage()
    store = new Store({storage, saveDebounceTimeout: 0})
    await store.init()
    store.onAfterHookError = () => {}
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

    model.add(collectionName, getDocData())
  })

  it('should throw error if preHook throws error', async (done) => {
    store.preHook = async (op, session, params) => {
      throw new Error('hook error')
    }

    model
      .add(collectionName, getDocData())
      .catch((err) => {
        assert(err)
        assert.equal(err.message, 'hook error')
        done()
      })
  })

  it.skip('should not throw error if afterHook throws error', async () => {
    store.afterHook = async (op, session, params) => {
      throw new Error('hook error')
    }

    await model.add(collectionName, getDocData())
  })

  it('should pass server params', async () => {
    store.afterHook = async (op, session, params) => {
      assert(params.server)
    }

    await model.add(collectionName, getDocData())
  })

  it('should pass prev params for del doc op', async () => {
    let docData = getDocData()
    await model.add(collectionName, docData)

    store.afterHook = async (op, session, params) => {
      assert.deepEqual(params.prev, docData)
    }

    await model.del(collectionName, docId)
  })

  it('should pass prev params for del field op', async () => {
    let docData = getDocData()
    await model.add(collectionName, docData)

    store.afterHook = async (op, session, params) => {
      assert.equal(params.prev, value)
    }

    await model.del(collectionName, docId, field)
  })
})
