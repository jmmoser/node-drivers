import net from 'net';
import Layer from '../Layer.js';
import { CallbackPromise } from '../../utils.js';
import { ConnectionStates, createStateMachine } from '../connectionState.js';

const LOG = false;

const TCPStateCodes = ConnectionStates;

const setConnectionState = createStateMachine('TCP layer', {
  [TCPStateCodes.Disconnected]: [TCPStateCodes.Connecting],
  [TCPStateCodes.Connecting]: [TCPStateCodes.Connected, TCPStateCodes.Disconnected],
  [TCPStateCodes.Connected]: [TCPStateCodes.Disconnecting, TCPStateCodes.Disconnected],
  [TCPStateCodes.Disconnecting]: [TCPStateCodes.Disconnected],
});

/** Settles a graceful disconnect, then wakes any requests queued meanwhile */
function finishDisconnect(layer) {
  if (layer._connectionState === TCPStateCodes.Disconnecting) {
    setConnectionState(layer, TCPStateCodes.Disconnected);
  }

  const resolveDisconnect = layer._resolveDisconnect;
  layer._resolveDisconnect = null;
  layer._disconnect = null;
  if (resolveDisconnect) {
    resolveDisconnect();
    /** deferred so close() can clear the queue first, otherwise
     * requests queued while disconnecting would reconnect */
    setImmediate(() => layer.sendNextMessage());
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
    /** currently disconnecting, queued requests are sent once it finishes */
    return false;
  }

  layer._connect = new Promise((resolve) => {
    const socket = net.createConnection(layer.options, () => {
      /** sanity check to make sure connection state has not changed since started connecting */
      if (layer.socket === socket && layer._connectionState === TCPStateCodes.Connecting) {
        setConnectionState(layer, TCPStateCodes.Connected);
        socket.setTimeout(layer.options.timeout);
        resolve(true);
        layer.sendNextMessage();
      } else {
        resolve(false);
      }
    });

    /** a previous socket's late events must not change the state of this one */
    const isCurrent = () => layer.socket === socket;

    layer.socket = socket;

    setConnectionState(layer, TCPStateCodes.Connecting);

    socket.setNoDelay(true); // Disable Nagle algorithm

    if (layer.options.connectTimeout > 0) {
      socket.setTimeout(layer.options.connectTimeout);
    }

    socket.on('data', (data) => {
      if (LOG) {
        console.log('RX', data);
        console.log('');
      }

      if (!isCurrent()) return;
      layer.emit('data', data);
      layer.forward(data);
    });

    socket.once('error', (err) => {
      /** a refused/failed connection emits 'error', never 'timeout' —
       * the connect promise must still settle or connected() hangs */
      resolve(false);
      if (!isCurrent()) return;
      setConnectionState(layer, TCPStateCodes.Disconnected);
      layer.destroy(err);
    });

    socket.once('close', () => {
      resolve(false);
      if (!isCurrent()) return;
      setConnectionState(layer, TCPStateCodes.Disconnected);
      finishDisconnect(layer);
    });

    socket.once('timeout', () => {
      if (socket.connecting) {
        resolve(false);
      }
      if (!isCurrent()) return;
      setConnectionState(layer, TCPStateCodes.Disconnected);
      layer.destroy(socket.connecting ? 'TCP layer connect timeout' : 'TCP layer write timeout');
    });

    socket.once('end', () => {
      /** the peer's FIN answering our own end() is part of a graceful disconnect */
      if (!isCurrent() || layer._connectionState !== TCPStateCodes.Connected) return;
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
    super('tcp');

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

        if (await connect(layer)) { // eslint-disable-line no-await-in-loop
          yield { host, port };
        }

        await layer.close(); // eslint-disable-line no-await-in-loop
      }
    }
  }

  connected(callback) {
    return CallbackPromise(callback, async (resolver) => {
      resolver.resolve(this._connect != null ? await this._connect : false);
    });
  }

  disconnect(callback) {
    return CallbackPromise(callback, async (resolver) => {
      switch (this._connectionState) {
        case TCPStateCodes.Connecting:
          setConnectionState(this, TCPStateCodes.Disconnected);
          /** abort the in-flight handshake or the OS completes it later
           * and the established socket leaks */
          if (this.socket && !this.socket.destroyed) {
            this.socket.destroy();
          }
          break;
        case TCPStateCodes.Connected:
          setConnectionState(this, TCPStateCodes.Disconnecting);
          this._disconnect = new Promise((resolve) => {
            this._resolveDisconnect = resolve;
          });
          this.socket.end(() => finishDisconnect(this));
          await this._disconnect;
          break;
        case TCPStateCodes.Disconnecting:
          /** every concurrent caller settles when the one disconnect does */
          await this._disconnect;
          break;
        default:
          break;
      }
      resolver.resolve();
    });
  }

  sendNextMessage() {
    if (this._connectionState === TCPStateCodes.Connected) {
      const request = this.getNextRequest();
      if (request) {
        if (LOG) {
          console.log('TX', request.message);
          console.log('');
        }

        this.socket.write(request.message, (err) => {
          if (err) {
            console.log('TCP layer write error:');
            console.log(err);
          }
          setImmediate(() => this.sendNextMessage());
        });
      }
    } else if (this._connectionState === TCPStateCodes.Disconnected) {
      /** Reconnect only when there is something to send, otherwise a
       * deferred wakeup after close() would reopen the connection */
      if (this.hasRequest()) {
        connect(this);
      }
    }
  }

  handleDestroy() {
    if (this.socket) {
      if (!this.socket.destroyed) {
        this.socket.destroy();
      }
      removeSocketListeners(this.socket);
    }

    /** the socket is gone and its listeners with it, so no 'close' event
     * will move the state for us */
    setConnectionState(this, TCPStateCodes.Disconnected);

    /** settle a graceful disconnect whose socket was torn down first */
    finishDisconnect(this);
  }
}
