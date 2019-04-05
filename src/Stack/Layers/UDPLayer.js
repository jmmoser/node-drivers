'use strict';

const dgram = require('dgram');
const Layer = require('./Layer');

class UDPLayer extends Layer {
  constructor(options) {
    super(null);

    this.options = Object.assign({
      target: {
        host: '127.0.0.1',
        port: 0
      },
      listen: {
        address: null,
        port: 0
      },
      waitForListen: true
    }, options);

    this._listening = false;

    const socket = dgram.createSocket('udp4', (data) => {
      this.handleData(data);
    });

    socket.on('error', (err) => {
      console.log('UDPLayer Error:');
      console.log(err);
    });

    socket.on('listening', () => {
      this._listening = true;
      this.sendNextMessage();
    });

    socket.bind(options.listen);

    this.socket = socket;
  }


  sendNextMessage() {
    if (this.options.waitForListen && !this._listening) {
      return;
    }

    const request = this.getNextRequest();
    if (request) {
      const { message, info } = request;
      const { target } = this.options;

      const port = info.port || target.port;
      const host = info.host || target.host;

      this.socket.send(message, port, host, err => {
        if (err) {
          console.log('UDPLayer Send Error:');
          console.log(err);
        }
      });

      this.sendNextMessage();
    }
  }


  disconnect(callback) {
    return Layer.CallbackPromise(callback, resolver => {
      this.socket.close(resolver.resolve);
    });
  }

  handleData(data) {
    this.forward(data);
  }
}

module.exports = UDPLayer;