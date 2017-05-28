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
    let self = this;

    if (self._connectionState > 0) return;

    self.connectionCleanup();

    self.socket = net.connect(self.options, function() {
      self.connected.apply(self, arguments);
    });

    self._connectionState = 1;

    self.socket.on('error', function(err) {
      // self.connectError.apply(self, arguments);
      self._connectionState = 0;
      console.log('TCPTransport ERROR: Connect error:');
      console.log(err);
    });

    self.socket.on('data', function() {
      self.handleData.apply(self, arguments);
    });

    self.socket.on('close', function() {
      console.log('TCP closed');
      self._connectionState = 0;
    });

    self.socket.on('end', function() {
      console.log('TCP end');
    });
  }

  handleData(data, info) {
    this.forward(data, info);
  }

  disconnect(callback) {
    let self = this;

    if (self._connectionState === 0) {
      if (callback) callback();
      return;
    }

    if (self.socket) {
      self.socket.end();
      self.socket.destroy();

      self.connectionCleanup();

      self.socket = null;
      self._connectionState = 0;

      if (callback) callback();

    } else if (callback) {
      callback();
    }
  }

  connected() {
    this._connectionState = 2;
    this.sendNextMessage();
  }

  sendNextMessage() {
    let self = this;

    if (self._connectionState === 2) {

      let request = self.getNextRequest();
      if (request) {
        self.socket.write(request.message, function() {
          self.sendNextMessage();
        });
      }
    }
  }

  connectionCleanup() {
    let self = this;
    if (self.socket) {
      let events = ['data', 'error', 'connect', 'end', 'close'];
      for (let i = 0; i < events.length; i++) {
        self.socket.removeAllListeners(events[i]);
      }
    }
  }
}

module.exports = TCPLayer;
