import Model from '../Model'
import ReconnectableWebSocket from 'reconnectable-websocket'
import WebSocketChannel from '../WebSocketChannel'
import SqliteStorage from './SqliteStorage'

let model

async function initModel () {
  let storage = new SqliteStorage(['_app', '_session'])
  model.storage = storage

  await storage.init()

  await model.collectionSet.fillFromClientStorage()

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
}

function getModel (channel, options = {}) {
  if (model) return model

  let ws

  if (!channel) {
    let wsUrl = options.wsUrl || 'ws://localhost:3000'

    let wsOptions = {
      automaticOpen: false,
      reconnectOnError: true,
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
