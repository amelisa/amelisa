import { EventEmitter } from 'events';

class ServerSocketChannel extends EventEmitter {
  constructor(ws, req) {
    super();
    this.ws = ws;
    this.req = req;
    this.isServer = false;

    ws.on('message', (data) => {
      let message = JSON.parse(data);
      this.emit('message', message);
    });

    ws.on('close', () => {
      this.emit('close');
    });

    ws.on('error', (err) => {
      this.emit('error', err);
    });
  }

  send(message) {
    this.ws.send(JSON.stringify(message));
  }
}

export default ServerSocketChannel;
