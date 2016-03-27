import serverInit from './server'

class ServerContext {
  constructor (port) {
    this.port = port
    this.sockets = {}
    this.nextSocketId = 0
  }

  async init () {
    let { server, store } = await serverInit()
    this.server = server
    this.store = store

    // Maintain a hash of all connected sockets
    server.on('connection', (socket) => {
      // Add a newly connected socket
      let socketId = this.nextSocketId++
      this.sockets[socketId] = socket
      // console.log('socket', socketId, 'opened')

      // Remove the socket when it closes
      socket.on('close', () => {
        // console.log('socket', socketId, 'closed')
        delete this.sockets[socketId]
      })

      // Extend socket lifetime for demo purposes
      socket.setTimeout(4000)
    })

    setTimeout(() => {
      console.log('server context close')
      this.close()
    }, 10000)
  }

  open () {
    return new Promise((resolve, reject) => {
      this.server.listen(this.port, (err) => {
        if (err) return reject(err)

        resolve()
      })
    })
  }

  close () {
    return new Promise((resolve, reject) => {
      this.server.close((err) => {
        if (err) return reject(err)

        resolve()
      })

      // Destroy all open sockets
      for (let socketId in this.sockets) {
        // console.log('socket', socketId, 'destroyed')
        this.sockets[socketId].destroy()
      }
    })
  }
}

export default ServerContext
