import { EventEmitter } from 'events'

class ServerSocketChannel extends EventEmitter {
  constructor (socket, req) {
    super()
    this.socket = socket
    this.req = req
    this.server = false
    this.opened = true

    socket.on('message', (json) => {
      let message
      try {
        message = JSON.parse(json)
      } catch (err) {
        return console.error('ServerSocketChannel unable to parse json', json)
      }
      this.emit('message', message)
    })

    socket.on('close', () => {
      this.opened = false
      this.emit('close')
    })

    socket.on('error', (err) => {
      this.opened = false
      this.emit('error', err)
    })
  }

  send (message) {
    if (!this.opened) return

    let json
    try {
      json = JSON.stringify(message)
    } catch (err) {
      return console.error('ServerSocketChannel unable to create json', message)
    }

    try {
      this.socket.send(json, this.ack)
    } catch (err) {
      console.error(err)
    }
  }

  ack (err) {
    if (err) console.error(err)
  }
}

export default ServerSocketChannel
