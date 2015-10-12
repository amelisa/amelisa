import { EventEmitter } from 'events';

class WebSocketChannel extends EventEmitter {
  constructor(socket) {
    super();
    this.socket = socket;
    this.open = false;
    this.buffer = [];

    socket.onopen = () => {
      this.open = true;

      for (let message of this.buffer) {
        this.send(message);
      }

      this.emit('open');
    }

    socket.onmessage = (e) => {
      let message = JSON.parse(e.data);
      this.emit('message', message);
    }

    socket.onclose = () => {
      this.open = false;
      this.emit('close');
    }

    socket.onerror = (err) => {
      console.error(err);
      this.emit('error', err);
    }
  }

  send(data) {
    if (this.open) {
      let message = JSON.stringify(data);
      this.socket.send(message);
    } else {
      this.buffer.push(data);
    }
  }
}

export default WebSocketChannel;
