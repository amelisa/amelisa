import http from 'http'
import { Server as WebSocketServer } from 'ws'
import app from './app'
import store from './store'

const port = process.env.PORT || 3000

async function init () {
  await store.init()

  store.on('channel', () => {
    console.log('channel')
  })

  let count = 0

  store.preHook = async (op) => {
    count++
  }

  function showCount () {
    console.log('ops/sec', count)
    count = 0
  }

  setInterval(showCount, 1000)

  let server = http.createServer()

  server.on('request', app)

  let wsServer = new WebSocketServer({server})

  wsServer.on('connection', store.onConnection)

  server.listen(port, (err) => {
    if (err) {
      console.error('Can\'t start server, Error:', err)
    } else {
      console.info(`${process.pid} listening. Go to: http://localhost:${port}`)
    }
  })
}

init().catch((err) => console.log(err, err.stack))
