'use strict';

const net = require('net');
const Layer = require('../Layer');

class TCPLayer extends Layer {
  constructor(options) {
    super('TCP');

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
    // this.connect();
    this._connect = this.connect();
  }

  connect(callback) {
    return Layer.CallbackPromise(callback, resolver => {
      if (this._connectionState > 0) return;

      const socket = net.createConnection(this.options, () => {
        this._connectionState = 2;
        resolver.resolve(true);
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
        // console.log('TCP Handling Data:');
        // console.log(data);
        handleData(data);
      });

      socket.on('close', () => {
        if (this._connectionState === 2) {
          socket.destroy();
        }
        this._connectionState = 0;
      });

      socket.on('timeout', () => {
        console.log(`TCPLayer timeout: ${this.options.host}:${this.options.port}`);
        this.close();
        resolver.resolve(false);
        // this._connectionState = 0;
        // socket.destroy();
        // this.destroy('TCPLayer timeout');
      });

      if (this.options.connectTimeout > 0) {
        socket.setTimeout(this.options.connectTimeout);
      }

      socket.on('end', () => {
        if (this._connectionState === 2) {
          this.destroy('TCPLayer ended');
        }
        this._connectionState = 0;
        socket.end(() => {
          socket.destroy();
        });
      });
    });
  }

  // connect() {
  //   if (this._connectionState > 0) return;

  //   const socket = net.createConnection(this.options, () => {
  //     this._connectionState = 2;
  //     socket.setTimeout(this.options.timeout);
  //     this.sendNextMessage();
  //   });

  //   this._connectionState = 1;
  //   this.socket = socket;

  //   const handleData = this.handleData.bind(this);

  //   socket.setNoDelay(true); // Disable Nagle algorithm

  //   socket.on('error', (err) => {
  //     this._connectionState = 0;
  //     // console.log('TCPLayer Error:');
  //     // console.log(err);
  //     this.destroy(err.message);
  //   });

  //   socket.on('data', (data) => {
  //     console.log('TCP Handling Data:');
  //     console.log(data);
  //     handleData(data);
  //   });

  //   socket.on('close', () => {
  //     if (this._connectionState === 2) {
  //       socket.destroy();
  //     }
  //     this._connectionState = 0;
  //   });

  //   socket.on('timeout', () => {
  //     console.log(`TCPLayer timeout: ${this.options.host}:${this.options.port}`);
  //     this.close();
  //     // this._connectionState = 0;
  //     // socket.destroy();
  //     // this.destroy('TCPLayer timeout');
  //   });

  //   if (this.options.connectTimeout > 0) {
  //     socket.setTimeout(this.options.connectTimeout);
  //   }
    
  //   socket.on('end', () => {
  //     if (this._connectionState === 2) {
  //       this.destroy('TCPLayer ended');
  //     }
  //     this._connectionState = 0;
  //     socket.end(() => {
  //       socket.destroy();
  //     });
  //   });
  // }

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

        // this._connectionState = -1;

        // this.socket.end(() => {
        //   this.socket.destroy();
        //   resolver.resolve();
        // });
      } else {
        resolver.resolve();
      }
    });
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
        if (await layer._connect) {
          yield { host, port };
        }

        await layer.close();
      }
    }
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
    }
  }
}

module.exports = TCPLayer;
