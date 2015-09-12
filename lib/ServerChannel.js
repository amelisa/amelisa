import { EventEmitter } from 'events';

class ServerChannel extends EventEmitter {
  constructor() {
    super();
    this.isServer = true;
  }

  send(message) {}

  pipe(channel) {
    channel.send = (message) => {
      this.emit('message', message);
    }
    return channel;
  }
}

export default ServerChannel;
