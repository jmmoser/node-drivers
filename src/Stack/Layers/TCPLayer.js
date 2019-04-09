'use strict';

const net = require('net');
const Layer = require('./Layer');

class TCPLayer extends Layer {
  constructor(options) {
    super(null);

    if (typeof options !== 'object') {
      object = {};
    }

    if (typeof options.connectTimeout !== 'number' || options.connectTimeout < 0) {
      options.connectTimeout = 3000;
    }

    if (typeof options.timeout !== 'number' || options.timeout < 0) {
      options.timeout = 0;
    }

    this.options = options;

    this._connectionState = 0;
    this.connect();
  }

  connect() {
    if (this._connectionState > 0) return;

    const socket = net.createConnection(this.options, () => {
      this._connectionState = 2;
      socket.setTimeout(this.options.timeout);
      this.sendNextMessage();
    });

    this._connectionState = 1;
    this.socket = socket;

    const handleData = this.handleData.bind(this);

    socket.setNoDelay(true); // Disable Nagle algorithm

    socket.on('error', (err) => {
      this._connectionState = 0;
      // console.log('TCPLayer Error:');
      // console.log(err);
      this.destroy(err.message);
    });

    socket.on('data', (data) => {
      // console.log('handling data')
      handleData(data);
    });

    socket.on('close', () => {
      // console.log('TCPLayer closed');
      if (this._connectionState === 2) {
        socket.destroy();
      }
      this._connectionState = 0;
    });

    socket.on('timeout', () => {
      // console.log(`TCPLayer timeout: ${this.options.host}:${this.options.port}`);
      this._connectionState = 0;
      socket.destroy();
      this.destroy('TCPLayer timeout');
    });

    if (this.options.connectTimeout > 0) {
      socket.setTimeout(this.options.connectTimeout);
    }
    
    socket.on('end', () => {
      // console.log('TCPLayer ended')
      if (this._connectionState === 2) {
        this.destroy('TCPLayer ended');
      }
      this._connectionState = 0;
      socket.end(() => {
        socket.destroy();
      });
    });
  }

  handleData(data) {
    this.forward(data);
  }

  disconnect(callback) {
    return Layer.CallbackPromise(callback, resolver => {
      if (this._connectionState > 0) {
        this._connectionState = -1;
        this.socket.end(() => {
          this.socket.destroy();
          resolver.resolve();
        });
      } else {
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
          setImmediate(() => this.sendNextMessage());
        });
      }
    }
  }
}

module.exports = TCPLayer;
