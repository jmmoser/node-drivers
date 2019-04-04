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

    this.socket = net.connect(this.options, () => {
      this._connectionState = 2;
      this.sendNextMessage();
    });

    this._connectionState = 1;

    this.socket.on('error', (err) => {
      this._connectionState = 0;
      console.log('TCPLayer ERROR: Connect error:');
      console.log(err);
    });

    const handleData = this.handleData.bind(this);

    this.socket.on('data', (data) => {
      handleData(data);
    });

    this.socket.on('close', () => {
      this._connectionState = 0;
    });

    this.socket.on('end', () => {
      //
    });
  }

  handleData(data) {
    this.forward(data);
  }

  disconnect(callback) {
    return Layer.CallbackPromise(callback, resolver => {
      if (this._connectionState !== 0) {
        this._connectionState = 0;
        this.socket.end();
        this.socket.destroy();

        this.socket = null;
      }

      resolver.resolve();
    });
  }

  sendNextMessage() {
    const self = this;

    if (self._connectionState === 2) {

      let request = self.getNextRequest();
      if (request) {
        self.socket.write(request.message, function() {
          self.sendNextMessage();
        });
      }
    }
  }
}

module.exports = TCPLayer;
