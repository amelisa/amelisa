import { EventEmitter } from 'events'

class MemoryPubsub extends EventEmitter {

  async init () {}

  send (message) {
    this.emit('message', message)
  }
}

export default MemoryPubsub
