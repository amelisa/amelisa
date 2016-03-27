import http from 'http'
import { Server as WebSocketServer } from 'ws'
import app from './app'
import store from './store'

async function init () {
  await store.init()

  store.preHook = async (op, session, params) => {

  }

  let server = http.createServer()

  server.on('request', app)

  let wsServer = new WebSocketServer({server})

  wsServer.on('connection', store.onConnection)

  // server.listen(port, (err) => {
  //   if (err) {
  //     console.error('Can\'t start server, Error:', err)
  //   } else {
  //     console.info(`${process.pid} listening. Go to: http://localhost:${port}`)
  //   }
  // })

  return {
    server,
    store
  }
}

export default init
