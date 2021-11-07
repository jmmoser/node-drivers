import dgram from 'dgram';
import Layer from './layer';
import { LayerNames } from './constants';
import { CallbackPromise } from '../utils';

async function setup(layer: UDPLayer) {
  /** Only await layer._settingUp if not null */
  if (layer._settingUp != null) {
    await layer._settingUp;
  }

  if (layer._listening === true) {
    return;
  }

  layer._settingUp = new Promise((resolve) => {
    const socket = dgram.createSocket(layer.options.type || 'udp4', (data, info) => {
      layer.emit('data', data, info);
      layer.forward(data, info);
    });

    socket.once('listening', () => {
      layer._listening = true;
      socket.setBroadcast(layer.options.broadcast!);
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

    socket.bind(layer.options.listen?.port, layer.options.listen?.address);

    layer._socket = socket;
  });
}

function removeSocketListeners(socket: dgram.Socket) {
  ['error', 'listening'].forEach((eventName) => {
    socket.removeAllListeners(eventName);
  });
}

type UDPLayerOptions = {
  target?: {
    host?: string;
    port?: number;
  };
  listen?: {
    address?: string;
    port?: number;
  };
  broadcast?: boolean;
  host?: string;
  port?: number;
}

export default class UDPLayer extends Layer {
  options: UDPLayerOptions;
  _socket?: dgram.Socket;
  _listening: boolean;
  _settingUp?: Promise<void>;

  constructor(options?: UDPLayerOptions | number) {
    super(LayerNames.UDP);

    this._listening = false;

    this._settingUp = undefined;

    this.options = {
      target: {
        host: '127.0.0.1',
        // port: 0
      },
      listen: {
        address: undefined,
        port: 0,
      },
      broadcast: true,
    };

    if (options) {
      if (typeof options === 'string') {
        this.options.target!.host = options;
      } else {
        const opts: UDPLayerOptions = options as UDPLayerOptions;

        if (opts.broadcast != null) {
          this.options.broadcast = !!opts.broadcast;
        }

        if (opts.host) {
          this.options.target!.host = opts.host;
        }

        if (opts.port) {
          this.options.target!.port = opts.port;
        }

        if (typeof opts.target === 'object') {
          this.options.target = opts.target;
        }
        if (typeof opts.listen === 'object') {
          this.options.listen = opts.listen;
        }
      }
    }

    setup(this);
  }

  handleDefaultOptions(defaultOptions: UDPLayerOptions /* , layer */) {
    if (
      this.options.target!.port == null
      && defaultOptions.target
      && defaultOptions.target?.port != null
    ) {
      this.options.target!.port = defaultOptions.target.port;
    }
  }

  sendNextMessage() {
    if (this._listening && this._socket) {
      const request = this.getNextRequest();
      if (request) {
        const { message, info } = request;
        const { target } = this.options;

        const port = info.port || target!.port;
        const host = info.host || target!.host;

        // console.log(`UDPLayer sending to ${host}:${port}`);

        this._socket.send(message, port, host, (err) => {
          if (err) {
            console.log('UDPLayer Send Error:');
            console.log(err);
          }
        });

        return true;
      }
    } else {
      setup(this);
    }
    return false;
  }

  disconnect(callback: () => void) {
    return CallbackPromise(callback, (resolver) => {
      this._listening = false;
      if (this._socket) {
        this._socket.close(resolver.resolve);
      } else {
        resolver.resolve();
      }
    });
  }

  handleDestroy() {
    this._listening = false;
    if (this._socket) {
      this._socket.unref();
      removeSocketListeners(this._socket);
      this._socket = undefined;
    }
  }
}
