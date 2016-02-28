import assert from 'assert'
import fakeIndexedDb from 'fake-indexeddb'
import localStorage from 'localStorage'
import jsdom from 'node-jsdom'
import getModel from '../../src/react/getModel'
import { MemoryStorage, Store } from '../../src/server'
import ServerChannel from '../../src/server/ServerChannel'
import { value } from '../util'

global.document = jsdom.jsdom('<!doctype html><html><body></body></html>')
global.window = document.parentWindow
global.window.localStorage = localStorage
global.window.indexedDB = fakeIndexedDb
global.navigator = global.window.navigator

const storeOptions = {
  version: 1
}
const options = {
  model: {
    isClient: true
  }
}
let store

describe('getModel', () => {
  beforeEach(async () => {
    fakeIndexedDb.deleteDatabase('amelisa')
    for (let key of Object.keys(localStorage)) {
      delete localStorage[key]
    }
    global.window.localStorage = localStorage // HACK
    let storage = new MemoryStorage()
    await storage.init()

    store = new Store(storage, null, null, storeOptions)
  })

  it('should get model', async () => {
    let channel = new ServerChannel()
    let model = getModel(channel, options)
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
    let model = getModel(channel, options)
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
    let model = getModel(channel, options)
    store.connectModel(model)

    await model.onReady()

    await model.set('_session.userId', value)

    channel = new ServerChannel()
    model = getModel(channel, options)
    store.connectModel(model)

    await model.onReady()

    assert.equal(model.get('_session.userId'), value)
  })
})
