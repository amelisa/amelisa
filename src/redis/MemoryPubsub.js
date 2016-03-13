import { EventEmitter } from 'events'
import { deepClone } from '../util'

class MemoryPubsub extends EventEmitter {

  async init () {}

  send (message) {
    // make it intentionally async
    process.nextTick(() => {
      this.emit('message', deepClone(message))
    })
  }
}

export default MemoryPubsub
