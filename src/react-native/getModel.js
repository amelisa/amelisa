import Model from '../client/Model'
import WebSocketChannel from '../client/WebSocketChannel'
import SqliteStorage from './SqliteStorage'

function getStorage (collectionNames) {
  return new SqliteStorage(collectionNames)
}

function getModel (channel, options = {}) {
  if (!channel) {
    let url = options.url || 'ws://localhost:3000'

    channel = new WebSocketChannel(url, options.ws)
  }

  let model = new Model(channel, options.source, options.model)

  window.model = model

  model.getStorage = getStorage

  // setTimeout workes unpredictably in react-native while debugging
  // so we use setImmediate
  setImmediate(() => channel.open())

  return model
}

export default getModel
