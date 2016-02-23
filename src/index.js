import debug from 'debug'
debug.enable(process.env.DEBUG)
import React from 'react'
import { isServer, serverRequire } from './util'
import getModel from './getModel'
import createContainer from './createContainer'
import RootComponent from './RootComponent'

let api = {
  createContainer,
  getModel,
  RootComponent
}

if (isServer) {
  api.MemoryStorage = serverRequire(module, './MemoryStorage')
  api.MongoStorage = serverRequire(module, './MongoStorage')
  api.RedisChannel = serverRequire(module, './RedisChannel')
  api.ServerSocketChannel = serverRequire(module, './ServerSocketChannel')
  api.Store = serverRequire(module, './Store')
  let { renderToString, renderToStaticMarkup } = serverRequire(module, './serverRendering')
  api.renderToString = renderToString
  api.renderToStaticMarkup = renderToStaticMarkup
  api.createElement = (...args) => {
    return React.createElement.apply(null, args)
  }
}

export default api
