import { EventEmitter } from 'events';

class WebSocketChannel extends EventEmitter {
  constructor(ws) {
    super();
    this.ws = ws;
    this.open = false;
    this.buffer = [];

    ws.onopen = () => {
      this.open = true;

      for (let message of this.buffer) {
        this.send(message);
      }

      this.emit('open');
    }

    ws.onmessage = (e) => {
      let message = JSON.parse(e.data);
      this.emit('message', message);
    }

    ws.onclose = () => {
      this.open = false;
      this.emit('close');
    }
  }

  send(data) {
    if (this.open) {
      let message = JSON.stringify(data);
      this.ws.send(message);
    } else {
      this.buffer.push(data);
    }
  }
}

export default WebSocketChannel;
