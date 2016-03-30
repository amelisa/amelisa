import { EventEmitter } from 'events'
import { deepClone } from '../util'

class ServerChannel extends EventEmitter {
  constructor () {
    super()
    this.server = true
    this.opened = false
  }

  open () {
    if (this.opened) return
    this.opened = true
    this.emit('open')

    if (!this.pipedChannel) return
    this.pipedChannel.open()
  }

  close () {
    if (!this.opened) return
    this.opened = false
    this.emit('close')

    if (!this.pipedChannel) return
    this.pipedChannel.close()
  }

  send (message) {}

  pipe (channel) {
    if (this.pipedChannel) {
      this.pipedChannel.send = () => {}
    }

    this.pipedChannel = channel
    channel.send = (message) => {
      if (!channel.opened) return

      // make it intentionally async
      process.nextTick(() => {
        this.emit('message', deepClone(message))
      })
    }

    return channel
  }
}

export default ServerChannel
