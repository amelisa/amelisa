import { EventEmitter } from 'events'
import ReconnectableWebSocket from 'reconnectable-websocket'

const defaultOptions = {
  automaticOpen: false,
  reconnectOnError: true,
  reconnectInterval: 3000
}

class WebSocketChannel extends EventEmitter {
  constructor (url, options = {}) {
    super()
    options = {...defaultOptions, ...options}
    let socket = this.socket = new ReconnectableWebSocket(url, null, options)

    socket.onopen = () => {
      this.emit('open')
    }

    socket.onmessage = (e) => {
      let json = e.data
      let message
      try {
        message = JSON.parse(json)
      } catch (err) {
        return console.error('WebSocketChannel unable to parse json', json)
      }
      this.emit('message', message)
    }

    socket.onclose = () => {
      this.emit('close')
    }

    socket.onerror = (err) => {
      this.emit('error', err)
    }
  }

  open () {
    this.socket.open && this.socket.open()
  }

  close () {
    this.socket.close && this.socket.close()
  }

  send (message) {
    let json
    try {
      json = JSON.stringify(message)
    } catch (err) {
      return console.error('WebSocketChannel unable to create json', message)
    }

    try {
      this.socket.send(json)
    } catch (err) {
      console.error(err)
    }
  }
}

export default WebSocketChannel
