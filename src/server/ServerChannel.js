import { EventEmitter } from 'events'
import { deepClone } from '../util'

class ServerChannel extends EventEmitter {
  constructor () {
    super()
    this.server = true
    this.opened = false

    this.on('open', () => {
      if (this.opened) return
      this.opened = true

      if (!this.pipedChannel) return
      this.pipedChannel.open()
    })

    this.on('close', () => {
      if (!this.opened) return
      this.opened = false

      if (!this.pipedChannel) return
      this.pipedChannel.close()
    })
  }

  open () {
    if (this.opened) return
    this.emit('open')
  }

  close () {
    if (!this.opened) return
    this.emit('close')
  }

  send (message) {}

  pipe (channel) {
    if (this.pipedChannel) {
      this.pipedChannel.send = () => {}
    }

    this.pipedChannel = channel
    channel.send = (message) => {
      if (!channel.opened) return console.error('ServerChannel is closed', message)
      // make it intentionally async
      process.nextTick(() => {
        this.emit('message', deepClone(message))
      })
    }

    return channel
  }
}

export default ServerChannel
