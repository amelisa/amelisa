import assert from 'assert'
import { Store } from '../../src/server'
import { getStorage, field, value, value2 } from '../util'

let storage
let store
let model
const url = '/'
const defaultValue = {[field]: value2}
const result = {
  [field]: value
}

describe('subscribes urlquery', () => {
  beforeEach(async () => {
    global.fetch = async (url) => {
      return {
        status: 200,
        json: async () => result
      }
    }
    storage = await getStorage()
    store = new Store({storage, saveDebounceTimeout: 0})
    await store.init()
    model = store.createModel()
  })

  it('should fetch url query', async () => {
    let query = model.query(url)
    await query.fetch()

    assert.deepEqual(query.get(), result)
  })

  it('should subscribe url query', async () => {
    let query = model.query(url)
    await query.subscribe()

    assert.deepEqual(query.get(), result)
  })

  it('should fetch url query and return default value while offline', async () => {
    model.close()
    let query = model.query(url, defaultValue)
    await query.fetch()

    assert.deepEqual(query.get(), defaultValue)
  })

  it('should fetch url query and return default value when status not 200', async () => {
    global.fetch = async (url) => {
      return {
        status: 500,
        json: async () => result
      }
    }
    let query = model.query(url, defaultValue)
    await query.fetch()

    assert.deepEqual(query.get(), defaultValue)
  })

  it('should fetch url query and return default value when response not json', async () => {
    global.fetch = async (url) => {
      return {
        status: 200,
        json: async () => {
          throw new Error('not able to parse')
        }
      }
    }
    let query = model.query(url, defaultValue)
    await query.fetch()

    assert.deepEqual(query.get(), defaultValue)
  })
})
