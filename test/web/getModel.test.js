import assert from 'assert'
import fakeIndexedDb from 'fake-indexeddb'
import localStorage from 'localStorage'
import jsdom from 'node-jsdom'
import { getModel, IndexedDbStorage } from '../../src/web'
import { Store } from '../../src/server'
import ServerChannel from '../../src/server/ServerChannel'
import { getStorage, value, sleep } from '../util'

global.document = jsdom.jsdom('<!doctype html><html><body></body></html>')
global.window = document.parentWindow
global.window.localStorage = localStorage
global.window.indexedDB = fakeIndexedDb
global.navigator = global.window.navigator

const options = {
  modelOptions: {
    isClient: true,
    clientSaveDebounceTimeout: 0
  },
  Storage: IndexedDbStorage
}
let store
let model

describe('getModel', () => {
  beforeEach(async () => {
    for (let key of Object.keys(localStorage)) {
      delete localStorage[key]
    }
    global.window.localStorage = localStorage // HACK
    let storage = await getStorage()
    store = new Store({storage, version: 1})
    await store.init()
  })

  afterEach(() => {
    model.close()
    delete model.storage
    fakeIndexedDb.deleteDatabase('amelisa')
  })

  it('should get model', async () => {
    let channel = new ServerChannel()
    model = getModel({
      ...options,
      ...{modelOptions: {...options.modelOptions, channel}}
    })
    store.connectModel(model)

    await model.onReady()

    assert(model)
    assert.equal(Object.keys(model.get()).length, 2)
    assert.equal(typeof model.get('_app.source'), 'string')
    assert.equal(model.get('_app.projectionHashes'), undefined)
  })

  it('should get model while offline', async () => {
    window.localStorage.setItem('collectionNames', JSON.stringify(['_app', '_session']))
    window.localStorage.setItem('version', 1)
    let channel = new ServerChannel()
    channel.open = () => {}
    model = getModel({
      ...options,
      ...{modelOptions: {...options.modelOptions, channel}}
    })
    channel.emit('close')
    await model.onReady()

    assert(model)
    assert(!model.online)
    assert.equal(Object.keys(model.get()).length, 2)
    assert.equal(typeof model.get('_app.source'), 'string')
    assert.equal(model.get('_session.online'), false)
  })

  it('should save data in indexedDB and get it next time', async () => {
    let channel = new ServerChannel()
    model = getModel({
      ...options,
      ...{modelOptions: {...options.modelOptions, channel}}
    })
    store.connectModel(model)

    await model.onReady()

    await model.set('_session.userId', value)
    await sleep(10)
    model.close()
    delete model.storage

    channel = new ServerChannel()
    model = getModel({
      ...options,
      ...{modelOptions: {...options.modelOptions, channel}}
    })
    store.connectModel(model)

    await model.onReady()

    assert.equal(model.get('_session.userId'), value)
  })
})
