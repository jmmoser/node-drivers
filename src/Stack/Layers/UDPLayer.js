'use strict';

const dgram = require('dgram');
const Layer = require('./Layer');


class UDPLayer extends Layer {
  constructor(options) {
    super(null);

    this.options = {
      target: {
        host: '127.0.0.1',
        port: 0
      },
      listen: {
        address: null,
        port: 0
      },
      // waitForListen: true,
      broadcast: true
    };

    if (options) {
      if (options.broadcast != null) {
        this.options.broadcast = !!options.broadcast;
      }
      // if (options.waitForListen != null) {
      //   this.options.waitForListen = !!options.waitForListen;
      // }

      if (options.host) {
        this.options.target.host = options.host;
      }

      if (options.port) {
        this.options.target.port = options.port;
      }

      if (typeof options.target === 'object') {
        this.options.target = options.target;
      }
      if (typeof options.listen === 'object') {
        this.options.listen = options.listen;
      }
    }

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
      socket.setBroadcast(this.options.broadcast);
      this.sendNextMessage();
    });

    socket.bind(options.listen);

    this.socket = socket;
  }

  sendNextMessage() {
    // if (this.options.waitForListen && !this._listening) {
    //   return;
    // }

    if (!this._listening) {
      return;
    }

    const request = this.getNextRequest();
    if (request) {
      const { message, info } = request;
      const { target } = this.options;

      const port = info.port || target.port;
      const host = info.host || target.host;

      console.log(`UDPLayer sending to ${host}:${port}`);

      this.socket.send(message, port, host, err => {
        if (err) {
          console.log('UDPLayer Send Error:');
          console.log(err);
        }
      });

      setImmediate(() => this.sendNextMessage());
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