import Model from '../client/Model'
import WebSocketChannel from '../client/WebSocketChannel'
import { getBundleJsonFromDom, onBundleReady } from '../web/dom'
import { isBrowser } from '../util'

const defaultOptions = {
  url: isBrowser ? `ws://${window.location.host}` : 'ws://localhost:3000'
}

function getModel (options = {}) {
  options = {...defaultOptions, ...options}

  let { url, wsOptions, modelOptions, Storage } = options
  modelOptions = modelOptions || {}
  let { channel } = modelOptions
  if (!channel) channel = modelOptions.channel = new WebSocketChannel(url, wsOptions)

  let model = new Model(modelOptions)

  if (Storage) {
    model.getStorage = (collectionNames, version) => {
      return new Storage(collectionNames, version)
    }
  }

  if (isBrowser) {
    model.onBundleReady = onBundleReady
    model.getBundleJsonFromDom = getBundleJsonFromDom
  }

  setTimeout(() => channel.open(), 0)

  return model
}

export default getModel
