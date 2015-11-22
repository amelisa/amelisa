import { EventEmitter } from 'events'

class ServerChannel extends EventEmitter {
  constructor () {
    super()
    this.server = true
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
