'use strict';

const net = require('net');
const Layer = require('../Layer');

class TCPLayer extends Layer {
  constructor(options) {
    super('tcp');

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
    connect(this);
  }


  static async* Scan(hosts, ports) {
    for (let i = 0; i < hosts.length; i++) {
      const host = hosts[i];
      for (let j = 0; j < ports.length; j++) {
        const port = ports[j];

        const layer = new TCPLayer({
          host,
          port,
          connectTimeout: 500
        });
        if (await layer.connected()) {
          yield { host, port };
        }

        await layer.close();
      }
    }
  }
  

  connected(callback) {
    return Layer.CallbackPromise(callback, async resolver => {
      resolver.resolve(await this._connect);
    });
  }


  handleData(data) {
    this.forward(data);
  }


  disconnect(callback) {
    return Layer.CallbackPromise(callback, resolver => {
      if (this._connectionState > 0) {
        if (this._connectionState === 1) {
          this._connectionState = 0;
          this.socket.destroy();
          resolver.resolve();
        } else {
          this._connectionState = -1;
          this.socket.end(() => {
            this.socket.destroy();
            resolver.resolve();
          });
        }
      } else {
        resolver.resolve();
      }
    });
  }


  sendNextMessage() {
    // console.log('tcp connection state:');
    // console.log(this._connectionState);
    if (this._connectionState === 2) {
      const request = this.getNextRequest();
      if (request) {
        // console.log('TCP SENDING:');
        // console.log(request.message);
        this.socket.write(request.message, (err) => {
          if (err) {
            console.log('TCPLayer WRITE ERROR:')
            console.log(err);
          }
          setImmediate(() => this.sendNextMessage());
        });
      }
    } else if (this._connectionState === 0) {
      /** Reconnect */
      connect(this);
    }
  }
}

module.exports = TCPLayer;


function connect(layer, callback) {
  layer._connect = Layer.CallbackPromise(callback, resolver => {
    if (layer._connectionState > 0) return;

    const socket = net.createConnection(layer.options, () => {
      layer._connectionState = 2;
      resolver.resolve(true);
      socket.setTimeout(layer.options.timeout);
      layer.sendNextMessage();
    });

    layer._connectionState = 1;
    layer.socket = socket;

    const handleData = layer.handleData.bind(layer);

    socket.setNoDelay(true); // Disable Nagle algorithm

    socket.on('error', (err) => {
      layer._connectionState = 0;
      // console.log('TCPLayer Error:');
      // console.log(err);
      layer.destroy(err.message);
    });

    socket.on('data', (data) => {
      // console.log('TCP Handling Data:');
      // console.log(data);
      handleData(data);
    });

    socket.on('close', () => {
      if (layer._connectionState === 2) {
        socket.destroy();
      }
      layer._connectionState = 0;
    });

    socket.on('timeout', () => {
      console.log(`TCPLayer timeout: ${layer.options.host}:${layer.options.port}`);
      layer._connectionState = -1;
      layer.close();
      resolver.resolve(false);
      // layer._connectionState = 0;
      // socket.destroy();
      // layer.destroy('TCPLayer timeout');
    });

    if (layer.options.connectTimeout > 0) {
      socket.setTimeout(layer.options.connectTimeout);
    }

    socket.on('end', () => {
      if (layer._connectionState === 2) {
        layer.destroy('TCPLayer ended');
      }
      layer._connectionState = 0;
      socket.end(() => {
        socket.destroy();
      });
    });
  });
  return layer._connect;
}
