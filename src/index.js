import React from 'react'
import MemoryStorage from './MemoryStorage'
import MongoStorage from './MongoStorage'
import RedisChannel from './RedisChannel'
import ServerSocketChannel from './ServerSocketChannel'
import Store from './Store'
import { renderToString, renderToStaticMarkup } from './react/serverRendering'

function createElement (...args) {
  return React.createElement.apply(null, args)
}

export default {
  MemoryStorage,
  MongoStorage,
  RedisChannel,
  ServerSocketChannel,
  Store,
  renderToString,
  renderToStaticMarkup,
  createElement
}
