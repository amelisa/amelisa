import IndexedDbStorage from '../IndexedDbStorage'
import Model from '../Model'
import ReconnectableWebSocket from 'reconnectable-websocket'
import WebSocketChannel from '../WebSocketChannel'
import { onDomReady } from '../util'

let model

async function initModel () {
  await onDomReady()

  // unbundle _app.clientStorage, _app.collectionNames, _app.version and _app.newProjectionHashes
  model.unbundleLocalData()
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

  model.set('_session.online', false)

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

  model.unbundleData()
}

function getModel (channel, options = {}) {
  if (model) return model

  let ws

  if (!channel) {
    let wsUrl = options.wsUrl || `ws://${window.location.host}`

    let wsOptions = {
      automaticOpen: false,
      reconnectInterval: 3000
    }
    ws = new ReconnectableWebSocket(wsUrl, null, wsOptions)
    channel = new WebSocketChannel(ws)
  }

  model = new Model(channel)

  window.model = model

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
