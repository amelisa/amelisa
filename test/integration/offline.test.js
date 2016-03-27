import assert from 'assert'
import eventToPromise from 'event-to-promise'
import { getBrowserContext, getServerContext } from './phantom'
import { collectionName, docId, sleep } from '../util'

describe.skip('integration offline', () => {
  it('should sync data after online', async () => {
    let serverContext = await getServerContext()
    let { store } = serverContext
    await serverContext.open()
    let browserContext = await getBrowserContext()
    let page = await browserContext.createPage()
    await sleep(100)
    let data = await browserContext.runScript(page, 'offline')
    assert.equal(data, 'ready')
    await serverContext.close()

    function addDoc () {
      let docData = {
        _id: '1',
        name: 'value'
      }
      model.add('users', docData)

      setTimeout(() => {
        window.callPhantom('saved')
      }, 500)
    }

    data = await browserContext.evaluate(page, addDoc)
    assert.equal(data, 'saved')
    let model = store.createModel()
    await model.subscribe([collectionName, docId])
    let doc = model.doc(collectionName, docId)
    doc.on('change', () => console.log('change'))
    assert(!doc.get())
    await serverContext.open()
    await eventToPromise(store, 'channel')
    await sleep(500)
    // await eventToPromise(doc, 'change')

    assert(doc)
  })
})
