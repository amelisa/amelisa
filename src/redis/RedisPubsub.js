import { EventEmitter } from 'events'
import RedisChannel from './RedisChannel'

class RedisPubsub extends EventEmitter {

  constructor (url) {
    super()

    this.url = url
  }

  async init () {
    const pub = new RedisChannel(this.url)
    const sub = new RedisChannel(this.url, true)

    this.send = pub.send.bind(pub)
    sub.on('message', (message) => {
      this.emit('message', message)
    })

    await pub.init()
    await sub.init()
  }
}

export default RedisPubsub
