import IndexedDbStorage from './IndexedDbStorage'
import Model from './Model'
import WebSocketChannel from './WebSocketChannel'
import util from './util'

let model

async function initModel () {
  await util.onDomReady()

  // unbundle _app.clientStorage, _app.collectionNames and _app.newProjectionHashes
  model.unbundleLocalData()
  let { clientStorage, collectionNames } = model.get('_app')

  if (clientStorage) {
    let storage = new IndexedDbStorage(Array.from(collectionNames).concat(['_app', '_session']))
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

  model.unbundleData()
}

function getModel (channel) {
  if (model) return model

  let ws

  if (!channel) {
    let wsUrl = 'ws://' + window.location.host
    let ReconnectingWebSocket = require('reconnectingwebsocket')

    // TODO: reconnection interval should be random
    let wsOptions = {
      automaticOpen: false,
      reconnectInterval: 3000
    }
    ws = new ReconnectingWebSocket(wsUrl, null, wsOptions)
    channel = new WebSocketChannel(ws)
  }

  model = new Model(channel)

  window.model = model

  initModel()
    .then(() => {
      if (ws) ws.open()
    })
    .catch((err) => {
      console.error(err, err.stack)
    })

  return model
}

export default getModel
