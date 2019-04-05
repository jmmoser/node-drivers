'use strict';

const net = require('net');
const Layer = require('./Layer');

class TCPLayer extends Layer {
  constructor(options) {
    super(null);

    this.options = options || {};
    this._connectionState = 0;

    this.connect();
  }

  connect() {
    if (this._connectionState > 0) return;

    this.socket = net.createConnection(this.options, () => {
      this._connectionState = 2;
      this.sendNextMessage();
    });

    this._connectionState = 1;

    this.socket.on('error', (err) => {
      this._connectionState = 0;
      console.log('TCPLayer Error:');
      console.log(err);
    });

    const handleData = this.handleData.bind(this);

    this.socket.on('data', (data) => {
      handleData(data);
    });

    this.socket.on('close', () => {
      // console.log('TCPLayer closed')
      this._connectionState = 0;
    });

    this.socket.on('end', () => {
      // console.log('TCPLayer ended')
    });
  }

  handleData(data) {
    this.forward(data);
  }

  disconnect(callback) {
    return Layer.CallbackPromise(callback, resolver => {
      if (this._connectionState > 0) {
        this._connectionState = -1;
        // this.socket.end(resolver.resolve);
        this.socket.end(() => {
          this.socket.destroy();
          resolver.resolve();
        });
        // this.socket.destroy();
        // this.socket = null;
      } else if (this._connectionState === 0) {
        resolver.resolve();
      }
    });
  }

  sendNextMessage() {
    if (this._connectionState === 2) {
      const request = this.getNextRequest();
      if (request) {
        this.socket.write(request.message, (err) => {
          if (err) {
            console.log('TCPLayer WRITE ERROR:')
            console.log(err);
          }
          this.sendNextMessage();
        });
      }
    }
  }
}

module.exports = TCPLayer;
