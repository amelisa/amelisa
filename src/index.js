import debug from 'debug'
debug.enable(process.env.DEBUG)
import React from 'react'
import util from './util'
import getModel from './getModel'
import createContainer from './createContainer'
import RootComponent from './RootComponent'

let api = {
  createContainer,
  getModel,
  RootComponent
}

if (util.isServer) {
  api.MemoryStorage = util.serverRequire(module, './MemoryStorage')
  api.MongoStorage = util.serverRequire(module, './MongoStorage')
  api.RedisChannel = util.serverRequire(module, './RedisChannel')
  api.ServerSocketChannel = util.serverRequire(module, './ServerSocketChannel')
  api.Store = util.serverRequire(module, './Store')
  let { renderToString, renderToStaticMarkup } = util.serverRequire(module, './serverRendering')
  api.renderToString = renderToString
  api.renderToStaticMarkup = renderToStaticMarkup
  api.createElement = (...args) => {
    return React.createElement.apply(null, args)
  }
}

export default api
