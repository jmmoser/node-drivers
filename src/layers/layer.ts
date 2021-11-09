import EventEmitter from 'events';
import Queue from '../queue';
import Defragger, { LengthHandler } from '../defragger';
import { CallbackPromise } from '../utils';
import CreateContext, { Context } from '../context';

const LOG = false;

// function incrementContext(self: any) {
//   self.__context = (self.__context + 1) % 0x100000000; // eslint-disable-line no-underscore-dangle
//   return self.__context; // eslint-disable-line no-underscore-dangle
// }

function passDefaultOptionsDown(defaultOptions: any, upperLayer: Layer) {
  let lowerLayer: Layer | undefined = upperLayer;
  while ((lowerLayer = lowerLayer._lowerLayer)) { // eslint-disable-line no-cond-assign
    const layerSpecificDefaultOptions = defaultOptions[lowerLayer.name];
    if (layerSpecificDefaultOptions) {
      lowerLayer.handleDefaultOptions(layerSpecificDefaultOptions, upperLayer);
    }
  }
}

function internalDestroy(layer: Layer, error: Error) {
  /** Clear all internal context callbacks */
  // eslint-disable-next-line no-underscore-dangle
  layer._contextToCallbackTimeouts.forEach((handle: NodeJS.Timeout) => clearTimeout(handle));
  layer._contextToCallbackTimeouts.clear(); // eslint-disable-line no-underscore-dangle

  layer._contextToCallback.forEach((cb) => {
    cb(error)
  }); // eslint-disable-line no-underscore-dangle
  layer._contextToCallback.clear(); // eslint-disable-line no-underscore-dangle

  layer._idContext.clear(); // eslint-disable-line

  layer.clearRequestQueue();

  layer.handleDestroy(error);
}

interface Options {
  handlesForwarding: boolean;
  // Context: () => number;
}

export default class Layer extends EventEmitter {
  _name: string;
  _queue: Queue;
  _lowerLayer?: Layer;
  _upperLayer?: Layer;
  _context: Context;
  _defragger?: Defragger;
  _handlesForwarding: boolean;
  _contextToCallbackTimeouts: Map<number, NodeJS.Timeout>;
  _contextToCallback: Map<number, Function>;
  _idContext: Map<string, any>;

  constructor(name: string, lowerLayer: Layer, options?: Options, defaultOptions?: any) {
    if (!name || typeof name !== 'string') {
      throw new Error('Layer name must be a non-empty string');
    }

    super();

    const opts = {
      handlesForwarding: false,
      // Context: incrementContext,
      ...options as {},
    };

    this._queue = new Queue();

    this._lowerLayer = lowerLayer;

    this._handlesForwarding = opts.handlesForwarding === true;

    this._name = name;
    this._context = CreateContext({ maxValue: 0x100000000 });
    this._contextToCallback = new Map();
    this._contextToCallbackTimeouts = new Map();
    this._idContext = new Map();

    if (lowerLayer != null) {
      if (lowerLayer._handlesForwarding !== true) {
        lowerLayer._upperLayer = this;
      }
      lowerLayer.layerAdded(this);
    }

    if (defaultOptions) {
      passDefaultOptionsDown(defaultOptions, this);
    }
  }

  get name() {
    return this._name;
  }

  setDefragger(lengthCallbackFunc: LengthHandler) {
    this._defragger = new Defragger(lengthCallbackFunc, this.name);
    return this;
  }

  /** OVERRIDE IF NEEDED */
  handleDefaultOptions(defaultOptions: any, upperLayer: Layer) {} // eslint-disable-line

  /** OVERRIDE IF NEEDED */
  disconnect(callback?: () => void) { // eslint-disable-line
    return CallbackPromise(callback, (resolver) => {
      resolver.resolve();
    });
  }

  /** OVERRIDE IF NEEDED, Use in lower layers to handle additions of upper layers */
  layerAdded(layer: Layer) { } // eslint-disable-line

  /** OVERRIDE IF NEEDED, Use in lower layers to handle removals of upper layers */
  layerRemoved(layer: Layer) { } // eslint-disable-line

  /** OVERRIDE */
  sendNextMessage() { } // eslint-disable-line

  /** OVERRIDE */
  handleData(data: Buffer, info: any, context: any) { } // eslint-disable-line

  /** OVERRIDE IF NEEDED */
  handleDestroy(error?: Error) { } // eslint-disable-line

  close(callback?: (a0?: Error, a1?: any) => void) {
    return CallbackPromise(callback, async (resolver) => {
      if (this._upperLayer != null) {
        await this._upperLayer.close();
      }

      await this.disconnect();

      /** Do not bubble up since close has already bubbled up */
      internalDestroy(this, new Error('Close'));

      // console.log(`Closed: ${this.name}`);
      resolver.resolve();
    });
  }

  destroy(error: Error) {
    if (this._upperLayer != null) {
      this._upperLayer.destroy(error);
    }

    internalDestroy(this, error);
  }

  forward(data: Buffer, info: any, context?: any) {
    if (this._upperLayer != null) {
      return Layer.forwardTo(this._upperLayer, data, info, context, this);
    }
    throw new Error('No layer to forward to');
    // return undefined;
  }

  static forwardTo(layer: Layer, data: Buffer, info: any, context: any, fromLayer: Layer) {
    if (layer._defragger != null) { // eslint-disable-line no-underscore-dangle
      layer._defragger.append(data); // eslint-disable-line no-underscore-dangle

      for (;;) {
        const defraggedData = layer._defragger.defrag();
        if (defraggedData) {
          Layer.handleData(layer, defraggedData, info, context, fromLayer);
        } else {
          break;
        }
      }
    } else {
      Layer.handleData(layer, data, info, context, fromLayer);
    }
  }

  static handleData(layer: Layer, data: Buffer, info: any, context: any, fromLayer: Layer) {
    layer.emit('data', data, info, context);
    if (LOG) {
      console.log(`${fromLayer.name} -> ${layer.name}`);
      console.log(data);
      console.log('');
    }
    layer.handleData(data, info, context);
  }

  send(message: Buffer, info: any, priority: boolean, context?: any) {
    this.emit('send', message, info, priority, context);
    const transport = this._lowerLayer != null ? this._lowerLayer : this;

    const obj = {
      layer: this,
      info: info || {},
      message,
      context,
    };

    transport._queue.enqueue(obj, priority);

    this.sendNextMessage();

    transport.sendNextMessage();
  }

  requestQueueSize(priority: boolean) {
    return this._queue.size(priority);
  }

  hasRequest(priority: boolean) {
    return this.requestQueueSize(priority) > 0;
  }

  getAllRequests() {
    return this._queue.dequeue(true);
  }

  getNextRequest(peek?: boolean) {
    if (peek === true) {
      return this._queue.peek();
    }
    return this._queue.dequeue();
  }

  clearRequestQueue() {
    this._queue.clear();
  }

  contextCallback(callback: Function, contextOrModifier?: any, timeout?: number) {
    // caller can pass their own context (e.g. PCCCLayer passes the transaction)
    if (typeof callback !== 'function') {
      throw new Error(`callback must be a function, received: ${typeof callback}`);
    }

    let context: any;
    let contextModifier;
    if (typeof contextOrModifier === 'function') {
      contextModifier = contextOrModifier;
    } else {
      context = contextOrModifier;
    }
    if (context == null) {
      context = this._context();
    }
    if (contextModifier) {
      context = contextModifier(context);
    }

    this._contextToCallback.set(context, callback);

    if (timeout != null && timeout > 0) {
      const timeoutHandle = setTimeout(() => {
        this._contextToCallback.delete(context);
        callback(`Timeout (${timeout}ms)`);
      }, timeout);

      this._contextToCallbackTimeouts.set(context, timeoutHandle);
    }

    return context;
  }

  callbackForContext(context: any) {
    if (this._contextToCallback.has(context)) {
      const callback = this._contextToCallback.get(context);
      this._contextToCallback.delete(context);

      if (this._contextToCallbackTimeouts.has(context)) {
        const timeoutHandle = this._contextToCallbackTimeouts.get(context);
        clearTimeout(timeoutHandle!);
        this._contextToCallbackTimeouts.delete(context);
      }
      return callback;
    }
    return undefined;
  }

  setContextForID(id: string, context: any) {
    if (id != null) {
      this._idContext.set(id, context);
      return true;
    }
    return false;
  }

  getContextForID(id: string, keep: boolean) {
    if (this._idContext.has(id)) {
      const context = this._idContext.get(id);
      if (keep !== true) {
        this._idContext.delete(id);
      }
      return context;
    }
    return undefined;
  }

  clearContexts() {
    const entries = this._idContext.entries();
    this._idContext.clear();
    return entries;
  }
}
