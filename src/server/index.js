import React from 'react'
import MemoryPubsub from '../redis/MemoryPubsub'
import MemoryStorage from '../mongo/MemoryStorage'
import MongoStorage from '../mongo/MongoStorage'
import RedisPubsub from '../redis/RedisPubsub'
import ServerSocketChannel from './ServerSocketChannel'
import Store from './Store'
import { renderToString, renderToStaticMarkup } from '../react/serverRendering'

function createElement (...args) {
  return React.createElement.apply(null, args)
}

export default {
  MemoryPubsub,
  MemoryStorage,
  MongoStorage,
  RedisPubsub,
  ServerSocketChannel,
  Store,
  renderToString,
  renderToStaticMarkup,
  createElement
}
