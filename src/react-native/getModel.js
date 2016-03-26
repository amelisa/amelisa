import Model from '../client/Model'
import WebSocketChannel from '../client/WebSocketChannel'
import SqliteStorage from './SqliteStorage'

function getStorage (collectionNames) {
  return new SqliteStorage(collectionNames)
}

function getModel (options = {}) {
  let { channel, url, wsOptions, modelOptions, dbQueries } = options

  if (!channel) {
    url = url || 'ws://localhost:3000'

    channel = new WebSocketChannel(url, wsOptions)
  }

  let model = new Model(channel, modelOptions, dbQueries)

  window.model = model

  model.getStorage = getStorage

  // setTimeout workes unpredictably in react-native while debugging
  // so we use setImmediate
  setImmediate(() => channel.open())

  return model
}

export default getModel
