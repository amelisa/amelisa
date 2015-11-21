import assert from 'assert'
import { getBrowserContext, getServerContext } from './phantom'

let serverContext
let browserContext
let page
let store
let model

describe.skip('integration offline', () => {
  it('should sync data after online', () => {
    return getServerContext()
      .then((sc) => {
        serverContext = sc
        store = serverContext.store
        return serverContext.open()
      })
      .then(() => getBrowserContext())
      .then((bc) => {
        browserContext = bc
        return browserContext.createPage()
      })
      .then((p) => {
        page = p
        return browserContext.runScript(page, 'offline')
      })
      .then((data) => {
        assert.equal(data, 'ready')
        return serverContext.close()
      })
      .then(() => {
        function addDoc () {
          let doc = {
            _id: '1',
            name: 'value'
          }
          model.add('users', doc)

          setTimeout(() => {
            window.callPhantom('saved')
          }, 100)
        }

        return browserContext.evaluate(page, addDoc)
      })
      .then((data) => {
        assert.equal(data, 'saved')

        model = store.createModel()

        return model.subscribe(['users', '1'])
      })
      .then(() => {
        let doc = model.get('users', '1')
        assert.equal(doc, undefined)

        return serverContext.open()
      })
      .then(() => {
        return new Promise((resolve, reject) => {
          store.once('client', () => {
            setTimeout(() => {
              let doc = model.get('users', '1')
              assert(doc)
              resolve()
            }, 500)
          })
        })
      })
  })
})
