import IndexedDbStorage from './IndexedDbStorage'
import Model from './Model'
import ReconnectableWebSocket from 'reconnectable-websocket'
import WebSocketChannel from './WebSocketChannel'
import { isBrowser, onDomReady } from './util'

let model

async function initModel () {
  if (isBrowser) await onDomReady()

  // unbundle _app.clientStorage, _app.collectionNames, _app.version and _app.newProjectionHashes
  if (isBrowser) model.unbundleLocalData()
  let { clientStorage, collectionNames, version } = model.get('_app') || {}

  if (clientStorage) {
    let storage = new IndexedDbStorage(Array.from(collectionNames).concat(['_app', '_session']), version)
    model.storage = storage

    await storage.init()

    // fill _app.projectionHashes
    await model.collectionSet.fillLocalCollectionsFromClientStorage()

    // clear collections in storage, where projections have changed
    let newProjectionHashes = model.get('_app.newProjectionHashes')
    await model.onProjections(newProjectionHashes)

    await model.collectionSet.fillFromClientStorage()
  }

  let source = model.get('_app.source')
  if (!source) {
    source = model.id()
    model.source = source
    model.set('_app.source', source)
  } else {
    model.source = source
  }

  let projectionHashes = model.get('_app.newProjectionHashes')
  model.set('_app.projectionHashes', projectionHashes)

  if (isBrowser) model.unbundleData()
}

function getModel (channel, options = {}) {
  if (model) return model

  let ws

  if (!channel) {
    let wsUrl = options.wsUrl || 'ws://' + (isBrowser ? window.location.host : 'localhost:3000')

    // TODO: reconnection interval should be random
    let wsOptions = {
      automaticOpen: false,
      reconnectInterval: 3000
    }
    ws = new ReconnectableWebSocket(wsUrl, null, wsOptions)
    channel = new WebSocketChannel(ws)
  }

  model = new Model(channel)

  if (isBrowser) window.model = model

  let initPromise = new Promise((resolve, reject) => {
    initModel()
      .then(() => {
        if (ws) ws.open()
        resolve()
      })
      .catch((err) => {
        console.error(err, err.stack)
        reject(err)
      })
  })

  model.init = () => initPromise

  return model
}

export default getModel
