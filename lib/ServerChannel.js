import { EventEmitter } from 'events';

class ServerChannel extends EventEmitter {
  send(message) {
  }

  pipe(channel) {
    channel.send = (message) => {
      this.emit('message', message);
    }
    return channel;
  }
}

export default ServerChannel;
