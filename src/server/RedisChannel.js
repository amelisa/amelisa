// let debug = require('debug')('RedisChannel')
import { EventEmitter } from 'events'
import redisUrl from 'redis-url'

const channelName = 'op'

class RedisChannel extends EventEmitter {
  constructor (url, sub = false) {
    super()
    this.url = url
    this.sub = sub
  }

  init () {
    let db = this.db = redisUrl.connect(this.url)
    return new Promise((resolve, reject) => {
      db.on('connect', () => {
        if (!this.sub) return resolve()

        db.on('subscribe', resolve)
        db.on('message', (channelName, message) => {
          message = JSON.parse(message)
          this.emit('message', message)
        })
        db.subscribe(channelName)
      })
    })
  }

  send (message) {
    message = JSON.stringify(message)
    this.db.publish(channelName, message)
  }
}

export default RedisChannel
