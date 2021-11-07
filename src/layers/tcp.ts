import net from 'net';
import Layer from './layer.js';
import { LayerNames } from './constants.js';
import { CallbackPromise } from '../utils.js';

const LOG = false;

const TCPStateCodes = {
  Disconnecting: -1,
  Disconnected: 0,
  Connecting: 1,
  Connected: 2,
};

function setConnectionState(layer, state) {
  const previousState = layer._connectionState;

  if (previousState !== state) {
    layer._connectionState = state;

    if (previousState === TCPStateCodes.Connecting && state === TCPStateCodes.Disconnecting) {
      throw new Error('TCP layer error: attempted to immediately transition from connecting to disconnecting');
    }

    if (previousState === TCPStateCodes.Connected && state === TCPStateCodes.Connecting) {
      throw new Error('TCP layer error: attempted to immediately transition from connected to connecting');
    }

    if (previousState === TCPStateCodes.Disconnected && state === TCPStateCodes.Connected) {
      throw new Error('TCP layer error: attempted to immediately transition from disconnected to connected');
    }

    if (previousState === TCPStateCodes.Disconnected && state === TCPStateCodes.Disconnecting) {
      throw new Error('TCP layer error: attempted to immediately transition from disconnected to disconnecting');
    }

    if (previousState === TCPStateCodes.Disconnecting && state === TCPStateCodes.Connected) {
      throw new Error('TCP layer error: attempted to immediately transition from disconnecting to connected');
    }
  }
}

function connect(layer) {
  if (
    layer._connectionState === TCPStateCodes.Connecting
    || layer._connectionState === TCPStateCodes.Connected
  ) {
    /** currently connecting or connected */
    return layer._connect;
  }

  if (layer._connectionState === TCPStateCodes.Disconnecting) {
    /** currently disconnecting */
    return false;
  }

  layer._connect = new Promise((resolve) => {
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

    setConnectionState(layer, TCPStateCodes.Connecting);

    socket.setNoDelay(true); // Disable Nagle algorithm

    if (layer.options.connectTimeout > 0) {
      socket.setTimeout(layer.options.connectTimeout);
    }

    socket.on('data', (data) => {
      layer.numberOfRX += 1;
      layer.totalRX += data.length;

      if (LOG) {
        console.log('RX', data.length, data);
        console.log('');
      }

      layer.emit('data', data);
      layer.forward(data);
    });

    socket.once('error', (err) => {
      setConnectionState(layer, TCPStateCodes.Disconnected, err);
      layer.destroy(err);
    });

    socket.once('close', () => {
      setConnectionState(layer, TCPStateCodes.Disconnected);
    });

    socket.once('timeout', () => {
      setConnectionState(layer, TCPStateCodes.Disconnected);
      layer.destroy(socket.connecting ? 'TCP layer connect timeout' : 'TCP layer write timeout');
      if (socket.connecting) {
        resolve(false);
      }
    });

    socket.once('end', () => {
      /** Might not be an error, assume it is an error until use case arrises */
      setConnectionState(layer, TCPStateCodes.Disconnected);
      layer.destroy('TCP layer socket received FIN while connected');
    });
  });

  return layer._connect;
}

function removeSocketListeners(socket) {
  ['error', 'data', 'close', 'timeout', 'end'].forEach((eventName) => {
    socket.removeAllListeners(eventName);
  });
}

export default class TCPLayer extends Layer {
  constructor(options) {
    super(LayerNames.TCP);

    this.numberOfTX = 0;
    this.numberOfRX = 0;
    this.totalTX = 0;
    this.totalRX = 0;

    let opts = options;

    if (typeof opts === 'string') {
      opts = {
        host: options,
      };
    }

    if (typeof opts !== 'object') {
      opts = {};
    }

    if (typeof opts.connectTimeout !== 'number' || opts.connectTimeout < 0) {
      opts.connectTimeout = 3000;
    }

    if (typeof opts.timeout !== 'number' || opts.timeout < 0) {
      opts.timeout = 0;
    }

    this.options = opts;

    this._connectionState = TCPStateCodes.Disconnected;
    this._desiredState = TCPStateCodes.Disconnected;
  }

  handleDefaultOptions(defaultOptions) {
    if (this.options.port == null && defaultOptions.port != null) {
      this.options.port = defaultOptions.port;
    }
  }

  static async* Scan(hosts, ports) {
    for (let i = 0; i < hosts.length; i++) {
      const host = hosts[i];
      for (let j = 0; j < ports.length; j++) {
        const port = ports[j];

        const layer = new TCPLayer({
          host,
          port,
          connectTimeout: 500,
        });

        if (await layer.connected()) { // eslint-disable-line no-await-in-loop
          yield { host, port };
        }

        await layer.close(); // eslint-disable-line no-await-in-loop
      }
    }
  }

  connected(callback) {
    return CallbackPromise(callback, async (resolver) => {
      resolver.resolve(await this._connect);
    });
  }

  disconnect(callback) {
    const hasCallback = typeof callback === 'function';

    if (this._connectionState === TCPStateCodes.Disconnected) {
      if (hasCallback) {
        setImmediate(callback);
      }
      return undefined;
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

    this._disconnect = CallbackPromise(callback, async (resolver) => {
      if (this._connectionState === TCPStateCodes.Connecting) {
        setConnectionState(this, TCPStateCodes.Disconnected);
        resolver.resolve();
      } else if (this._connectionState === TCPStateCodes.Connected) {
        // console.log(`TCP layer queue size at disconnect: ${this.requestQueueSize()}`);
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

  sendNextMessage() {
    if (this._connectionState === 2) {
      // const buffer = Buffer.concat(this.getAllRequests().map((req) => req.message));

      // if (buffer.length > 0) {
      //   if (LOG) {
      //     console.log('TX', buffer.message);
      //     console.log('');
      //   }

      //   this.numberOfTX += 1;

      //   this.socket.write(buffer, (err) => {
      //     if (err) {
      //       console.log('TCP layer write error:');
      //       console.log(err);
      //     }
      //   });

      //   return true;
      // }

      const request = this.getNextRequest();

      if (request) {
        if (LOG) {
          console.log('TX', request.message);
          console.log('');
        }

        this.numberOfTX += 1;
        this.totalTX += request.message.length;

        this.socket.write(request.message, (err) => {
          if (err) {
            console.log('TCP layer write error:');
            console.log(err);
          }
        });

        return true;
      }
    } else if (this._connectionState === 0) {
      /** Reconnect */
      connect(this);
    }
    return false;
  }

  stats() {
    return {
      numberOfTX: this.numberOfTX,
      numberOfRX: this.numberOfRX,
      totalTX: this.totalTX,
      totalRX: this.totalRX,
    };
  }

  handleDestroy() {
    if (this.socket) {
      if (!this.socket.destroyed) {
        this.socket.destroy();
      }
      removeSocketListeners(this.socket);
    }

    this._disconnect = null;
    if (Array.isArray(this._additionalDisconnectCallbacks)) {
      this._additionalDisconnectCallbacks.forEach((callback) => callback());
      this._additionalDisconnectCallbacks.length = 0;
    }
  }
}
