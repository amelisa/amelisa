import IndexedDbStorage from './IndexedDbStorage'
import Model from './Model'
import WebSocketChannel from './WebSocketChannel'
import util from './util'

let model

async function initModel () {
  await util.onDomReady()

  model.unbundleLocalData()

  let { clientStorage, collectionNames } = model.get('_app')

  if (clientStorage) {
    // Delete data of local collections to create them later with storage
    delete model.collectionSet.data['_app']
    delete model.collectionSet.data['_session']
    let storage = new IndexedDbStorage(Array.from(collectionNames).concat(['_app', '_session']))
    model.storage = storage
    model.collectionSet.storage = storage
    model.querySet.storage = storage

    await storage.init()
    await model.collectionSet.fillLocalCollectionsFromClientStorage()

    model.unbundleLocalData()

    let newProjectionHashes = model.get('_app.newProjectionHashes')
    await model.onProjections(newProjectionHashes)
  }

  await model.init()

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

function getModel () {
  if (model) return model

  let wsUrl = 'ws://' + window.location.host
  let ReconnectingWebSocket = require('reconnectingwebsocket')

  // TODO: reconnection interval should be random
  let wsOptions = {
    automaticOpen: false,
    reconnectInterval: 3000
  }
  let ws = new ReconnectingWebSocket(wsUrl, null, wsOptions)
  let channel = new WebSocketChannel(ws)

  model = new Model(channel)

  window.model = model

  initModel()
    .then(() => ws.open())
    .catch((err) => {
      console.error(err, err.stack)
    })

  return model
}

export default getModel
