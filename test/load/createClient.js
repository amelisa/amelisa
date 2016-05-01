import WebSocket from 'ws'
import Model from '../../src/client/Model'
import { dbQueries } from '../../src/mongo'
import WebSocketChannel from '../../src/client/WebSocketChannel'

global.WebSocket = WebSocket
const url = 'ws://localhost:3000'

async function createClient () {
  let channel = new WebSocketChannel(url, {reconnectOnError: true, reconnectOnCleanClose: true})
  let options = {
    isClient: true,
    source: Model.prototype.id()
  }
  let model = new Model({...options, channel, dbQueries})

  model.on('online', () => {
    console.log('online')
  })

  model.on('offline', () => {
    console.log('offline')
  })

  channel.open()

  return model
}

export default createClient
