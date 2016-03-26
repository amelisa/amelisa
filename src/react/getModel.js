import Model from '../client/Model'
import WebSocketChannel from '../client/WebSocketChannel'
import IndexedDbStorage from '../web/IndexedDbStorage'
import { getBundleJsonFromDom, onDomReady } from '../web/dom'

function getStorage (collectionNames, version) {
  return new IndexedDbStorage(collectionNames, version)
}

async function onBundleReady () {
  await onDomReady()
}

function getModel (options = {}) {
  let { channel, url, wsOptions, modelOptions, dbQueries } = options

  if (!channel) {
    url = url || `ws://${window.location.host}`

    channel = new WebSocketChannel(url, wsOptions)
  }

  let model = new Model(channel, modelOptions, dbQueries)

  window.model = model

  model.getStorage = getStorage
  model.onBundleReady = onBundleReady
  model.getBundleJsonFromDom = getBundleJsonFromDom

  setTimeout(() => channel.open(), 0)

  return model
}

export default getModel
