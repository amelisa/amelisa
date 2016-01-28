import assert from 'assert'
import fakeIndexedDb from 'fake-indexeddb'
import jsdom from 'node-jsdom'
import getModel from '../src/getModel'
import ServerChannel from '../src/ServerChannel'
import { value } from './util'

global.document = jsdom.jsdom('<!doctype html><html><body></body></html>')
global.window = document.parentWindow
global.window.indexedDB = fakeIndexedDb
global.navigator = global.window.navigator

describe('getModel', () => {
  it('should get model', async () => {
    let channel = new ServerChannel()
    let model = getModel(channel)

    await model.init()

    assert(model)
    assert.equal(Object.keys(model.get()).length, 2)
    assert.equal(typeof model.get('_app.source'), 'string')
    assert.equal(model.get('_app.projectionHashes'), undefined)
  })

  it('should save data in indexedDB and get it next time', async () => {
    let channel = new ServerChannel()
    let model = getModel(channel)

    await model.init()

    await model.set('_session.userId', value)

    channel = new ServerChannel()
    model = getModel(channel)

    await model.init()

    assert.equal(model.get('_session.userId'), value)
  })
})
