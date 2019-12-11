'use strict';

const { CallbackPromise } = require('../../utils');
const dgram = require('dgram');
const Layer = require('../Layer');

class UDPLayer extends Layer {
  constructor(options) {
    super('udp');

    this.options = {
      target: {
        host: '127.0.0.1',
        // port: 0
      },
      listen: {
        address: null,
        port: 0
      },
      broadcast: true
    };

    if (options) {
      if (typeof options === 'string') {
        this.options.target.host = options;
      }

      if (options.broadcast != null) {
        this.options.broadcast = !!options.broadcast;
      }

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

    setup(this);
  }


  handleDefaultOptions(defaultOptions, layer) {
    if (this.options.target.port == null && defaultOptions.target && defaultOptions.target.port != null) {
      // console.log(`${this.name} layer setting target port ${defaultOptions.target.port} from ${layer.name} layer`);
      this.options.target.port = defaultOptions.target.port;
    }
  }


  sendNextMessage() {
    if (this._listening) {
      const request = this.getNextRequest();
      if (request) {
        const { message, info } = request;
        const { target } = this.options;

        const port = info.port || target.port;
        const host = info.host || target.host;

        // console.log(`UDPLayer sending to ${host}:${port}`);

        this.socket.send(message, port, host, err => {
          if (err) {
            console.log('UDPLayer Send Error:');
            console.log(err);
          }
        });

        setImmediate(() => this.sendNextMessage());
      }
    } else {
      setup(this);
    }
  }


  disconnect(callback) {
    return CallbackPromise(callback, resolver => {
      this._listening = false;
      this.socket.close(resolver.resolve);
    });
  }


  handleDestroy() {
    this._listening = false;
    if (this.socket) {
      this.socket.unref();
      removeSocketListeners(this.socket);
      this.socket = null;
    }
  }
}

module.exports = UDPLayer;


async function setup(layer) {
  /** Only await layer._settingUp if not null */
  if (layer._settingUp != null) {
    await layer._settingUp;
  }

  if (layer._listening === true) {
    return;
  }

  layer._settingUp = new Promise(function(resolve) {
    const socket = dgram.createSocket(layer.options.type || 'udp4', (data, info) => {
      layer.emit('data', data, info);
      layer.forward(data, info);
    });

    socket.once('listening', () => {
      layer._listening = true;
      socket.setBroadcast(layer.options.broadcast);
      resolve(true);
      layer.sendNextMessage();
    });

    socket.once('error', (err) => {
      console.log('UDP layer Error:');
      console.log(err);
      layer._listening = false;
      resolve(false);
      layer.destroy(err);
    });

    socket.once('close', () => {
      layer._listening = false;
      resolve(false);
    });

    socket.bind(layer.options.listen);

    layer.socket = socket;
  });
}


function removeSocketListeners(socket) {
  ['error', 'listening'].map(eventName => {
    socket.removeAllListeners(eventName);
  });
}