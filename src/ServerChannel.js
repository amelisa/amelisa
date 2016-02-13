import { EventEmitter } from 'events'

class ServerChannel extends EventEmitter {
  constructor () {
    super()
    this.server = true
    this.open = false

    this.on('open', () => {
      this.open = true
    })

    this.on('close', () => {
      if (!this.open) return
      this.open = false

      if (!this.pipedChannel) return
      this.pipedChannel.emit('close')
    })
  }

  init () {
    return Promise.resolve()
  }

  send (message) {}

  pipe (channel) {
    this.pipedChannel = channel
    channel.send = (message) => {
      // make it intentionally async
      process.nextTick(() => {
        this.emit('message', message)
      })
    }

    return channel
  }
}

export default ServerChannel
