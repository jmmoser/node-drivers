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

    this._connectionState = TCPStateCodes.Disconnected;
    this._desiredState = TCPStateCodes.Disconnected;
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
    this.emit('data', data);
    this.forward(data);
  }


  disconnect(callback) {
    const hasCallback = typeof callback === 'function';

    if (this._connectionState === TCPStateCodes.Disconnected) {
      if (hasCallback) {
        setImmediate(callback);
      }
      return;
    }

    if (this._connectionState === TCPStateCodes.Disconnecting) {
      if (hasCallback) {
        if (!Array.isArray(this._additionalDisconnectCallbacks)) {
          this._additionalDisconnectCallbacks = [];
        }
        this._additionalDisconnectCallbacks.push(callback);
      }
      return this._disconnect;
    }
    
    this._disconnect = Layer.CallbackPromise(callback, async resolver => {
      if (this._connectionState === TCPStateCodes.Connecting) {
        setConnectionState(this, TCPStateCodes.Disconnected);
        resolver.resolve();
      } else if (this._connectionState === TCPStateCodes.Connected) {
        setConnectionState(this, TCPStateCodes.Disconnecting);
        this.socket.end(() => {
          setConnectionState(this, TCPStateCodes.Disconnected);
          resolver.resolve();
        });
      } else {
        throw new Error(`Unexpected state while disconnecting: ${this._connectionState}`);
      }
    });

    return this._disconnect;
  }

  // disconnect(callback) {
  //   return Layer.CallbackPromise(callback, resolver => {
  //     if (this._connectionState > 0) {
  //       if (this._connectionState === 1) {
  //         this._connectionState = 0;
  //         this.socket.destroy();
  //         resolver.resolve();
  //       } else {
  //         this._connectionState = -1;
  //         this.socket.end(() => {
  //           this.socket.destroy();
  //           resolver.resolve();
  //         });
  //       }
  //     } else {
  //       resolver.resolve();
  //     }
  //   });
  // }


  sendNextMessage() {
    if (this._connectionState === 2) {
      const request = this.getNextRequest();
      if (request) {
        // console.log('Sending', request.message);
        this.socket.write(request.message, err => {
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


  handleDestroy(error) {
    if (this.socket) {
      // printSocketState(this.socket);
      if (!this.socket.destroyed) {
        this.socket.destroy();
      }
      cleanupSocketListeners(this.socket);
    }

    this._disconnect = null;
    if (Array.isArray(this._additionalDisconnectCallbacks)) {
      this._additionalDisconnectCallbacks.forEach(callback => callback());
      this._additionalDisconnectCallbacks.length = 0;
    }

    this.clearMessageQueue();
  }
}

module.exports = TCPLayer;


// function printSocketState(socket) {
//   if (socket) {
//     console.log({
//       connecting: socket.connecting,
//       destroyed: socket.destroyed,
//       pending: socket.pending
//     });
//   }
// }


const TCPStateCodes = {
  Disconnecting: -1,
  Disconnected: 0,
  Connecting: 1,
  Connected: 2
};

// const TCPStateNames = InvertKeyValues(TCPStateCodes);


function setConnectionState(layer, state, error) {
  const previousState = layer._connectionState;

  if (previousState !== state) {
    layer._connectionState = state;

    // console.log(`${previousState} => ${state}`);
    // if (error) {
    //   console.log(error.message ? error.message : error);
    // }
    // printSocketState(layer.socket);

    /**
     * 0 -> 1: nothing
     * 1 -> 2: nothing
     * 2 -> -1: nothing
     * -1 -> 0: nothing
     * -1 > 1: mark should reconnect after disconnect
     * 1 -> 0: error occurred, force destroy socket
     * 2 -> 0: error occurred, force destroy socket
     * 1 -> -1: wait for timeout to occur or force destroy?
     * 2 -> 1: this should never happen
     * 0 -> 2: this should never happen
     * 0 -> -1: this should never happen
     * -1 > 2: this should never happen
     */

    if (previousState === TCPStateCodes.Connecting && state === TCPStateCodes.Disconnecting) {
      throw new Error(`TCP layer error: attempted to immediately transition from connecting to disconnecting`);
    } else if (previousState === TCPStateCodes.Connected && state === TCPStateCodes.Connecting) {
      throw new Error(`TCP layer error: attempted to immediately transition from connected to connecting`);
    } else if (previousState === TCPStateCodes.Disconnected && state === TCPStateCodes.Connected) {
      throw new Error(`TCP layer error: attempted to immediately transition from disconnected to connected`);
    } else if (previousState === TCPStateCodes.Disconnected && state === TCPStateCodes.Disconnecting) {
      throw new Error(`TCP layer error: attempted to immediately transition from disconnected to disconnecting`);
    } else if (previousState === TCPStateCodes.Disconnecting && state === TCPStateCodes.Connected) {
      throw new Error(`TCP layer error: attempted to immediately transition from disconnecting to connected`);
    }

    if (state === TCPStateCodes.Disconnected) {
      layer.destroy(error);
    }
  }
}


function connect(layer) {
  if (layer._connectionState === TCPStateCodes.Connecting || layer._connectionState === TCPStateCodes.Connected) {
    /** currently connecting or connected */
    // console.log('already connecting');
    return layer._connect;
  }

  if (layer._connectionState === TCPStateCodes.Disconnecting) {
    /** currently disconnecting */
    return false;
  }

  layer._connect = new Promise(resolve => {
    const socket = net.createConnection(layer.options, () => {
      // console.log('connected');
      /** sanity check to make sure connection state has not changed since started connecting */
      if (layer._connectionState === TCPStateCodes.Connecting) {
        setConnectionState(layer, TCPStateCodes.Connected);
        socket.setTimeout(layer.options.timeout);
        resolve(true);
        layer.sendNextMessage();
      } else {
        resolve(false);
      }
    });

    layer.socket = socket;

    /** layer._connectionState: 0 -> 1 */
    setConnectionState(layer, TCPStateCodes.Connecting);

    const handleData = layer.handleData.bind(layer);

    socket.setNoDelay(true); // Disable Nagle algorithm

    if (layer.options.connectTimeout > 0) {
      socket.setTimeout(layer.options.connectTimeout);
    }

    socket.on('data', data => {
      // console.log('TCP Handling Data:');
      // console.log(data);
      handleData(data);
    });

    socket.once('error', err => {
      // console.log('TCP layer Error:');
      // console.log(err);
      setConnectionState(layer, TCPStateCodes.Disconnected, err);
    });

    socket.once('close', () => {
      // console.log('TCP layer CLOSE');
      setConnectionState(layer, TCPStateCodes.Disconnected);
    });

    socket.once('timeout', () => {
      setConnectionState(layer, TCPStateCodes.Disconnected, socket.connecting ? 'Connect timeout' : 'Write timeout');
      if (socket.connecting) {
        resolve(false);
      }
    });

    socket.once('end', () => {
      /** Might not be an error, assume it is an error until use case arrises */
      setConnectionState(layer, TCPStateCodes.Disconnected, 'TCP layer socket received FIN while connected')
    });
  });

  return layer._connect;
}


function cleanupSocketListeners(socket) {
  // console.log(new Error('a'));
  // console.log('removing listeners');
  ['error', 'data', 'close', 'timeout', 'end'].map(eventName => {
    socket.removeAllListeners(eventName);
  });
}