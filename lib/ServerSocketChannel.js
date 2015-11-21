import { EventEmitter } from 'events'

class ServerSocketChannel extends EventEmitter {
  constructor (socket, req) {
    super()
    this.socket = socket
    this.req = req
    this.server = false
    this.open = true

    socket.on('message', (data) => {
      let message = JSON.parse(data)
      this.emit('message', message)
    })

    socket.on('close', () => {
      this.open = false
      this.emit('close')
    })

    socket.on('error', (err) => {
      this.emit('error', err)
    })
  }

  send (message) {
    if (!this.open) return

    this.socket.send(JSON.stringify(message))
  }
}

export default ServerSocketChannel
