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
    options = Object.assign({}, defaultOptions, options)
    let socket = this.socket = new ReconnectableWebSocket(url, null, options)

    socket.onopen = () => {
      this.emit('open')
    }

    socket.onmessage = (e) => {
      let message = JSON.parse(e.data)
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

  send (data) {
    let message = JSON.stringify(data)
    this.socket.send(message)
  }
}

export default WebSocketChannel
