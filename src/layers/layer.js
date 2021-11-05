import EventEmitter from 'events';
import Queue from '../queue.js';
import Defragger from '../defragger.js';
import { CallbackPromise } from '../utils.js';

const LOG = false;

function incrementContext(self) {
  self.__context = (self.__context + 1) % 0x100000000; // eslint-disable-line no-underscore-dangle
  return self.__context; // eslint-disable-line no-underscore-dangle
}

function passDefaultOptionsDown(defaultOptions, upperLayer) {
  let lowerLayer = upperLayer;
  while ((lowerLayer = lowerLayer.lowerLayer)) { // eslint-disable-line no-cond-assign
    const layerSpecificDefaultOptions = defaultOptions[lowerLayer.name];
    if (layerSpecificDefaultOptions) {
      lowerLayer.handleDefaultOptions(layerSpecificDefaultOptions, upperLayer);
    }
  }
}

function internalDestroy(layer, error) {
  /** Clear all internal context callbacks */
  // eslint-disable-next-line no-underscore-dangle
  layer.__contextToCallbackTimeouts.forEach((handle) => clearTimeout(handle));
  layer.__contextToCallbackTimeouts.clear(); // eslint-disable-line no-underscore-dangle

  layer.__contextToCallback.forEach((cb) => cb(error)); // eslint-disable-line no-underscore-dangle
  layer.__contextToCallback.clear(); // eslint-disable-line no-underscore-dangle

  layer.__idContext.clear(); // eslint-disable-line

  layer.clearRequestQueue();

  layer.handleDestroy(error);
}

export default class Layer extends EventEmitter {
  constructor(name, lowerLayer, options, defaultOptions) {
    if (!name || typeof name !== 'string') {
      throw new Error('Layer name must be a non-empty string');
    }

    super();

    const opts = {
      handlesForwarding: false,
      contextGenerator: incrementContext,
      ...options,
    };

    this._queue = new Queue();

    this.lowerLayer = lowerLayer;

    this.contextGenerator = opts.contextGenerator;
    this.handlesForwarding = opts.handlesForwarding === true;

    this.__name = name;
    this.__context = 0;
    this.__contextToCallback = new Map();
    this.__contextToCallbackTimeouts = new Map();
    this.__idContext = new Map();

    this._open = 0;

    if (lowerLayer != null) {
      if (lowerLayer.handlesForwarding !== true) {
        lowerLayer.upperLayer = this;
      }
      lowerLayer.layerAdded(this);
    }

    if (defaultOptions) {
      passDefaultOptionsDown(defaultOptions, this);
    }
  }

  get name() {
    return this.__name;
  }

  setDefragger(isCompleteFunc, lengthCallbackFunc) {
    this._defragger = new Defragger(isCompleteFunc, lengthCallbackFunc, this.name);
    return this;
  }

  /** OVERRIDE IF NEEDED */
  handleDefaultOptions(defaultOptions, upperLayer) {} // eslint-disable-line

  /** OVERRIDE IF NEEDED */
  disconnect(callback) { // eslint-disable-line
    return CallbackPromise(callback, (resolver) => {
      resolver.resolve();
    });
  }

  /** OVERRIDE IF NEEDED, Use in lower layers to handle additions of upper layers */
  layerAdded(layer) { } // eslint-disable-line

  /** OVERRIDE IF NEEDED, Use in lower layers to handle removals of upper layers */
  layerRemoved(layer) { } // eslint-disable-line

  /** OVERRIDE */
  sendNextMessage() { } // eslint-disable-line

  /** OVERRIDE */
  handleData(data) { } // eslint-disable-line

  /** OVERRIDE IF NEEDED */
  handleDestroy(error) { } // eslint-disable-line

  close(callback) {
    return CallbackPromise(callback, async (resolver) => {
      if (this.upperLayer != null) {
        await this.upperLayer.close();
      }

      await this.disconnect();

      /** Do not bubble up since close has already bubbled up */
      internalDestroy(this, 'Close');

      // console.log(`Closed: ${this.name}`);
      resolver.resolve();
    });
  }

  destroy(error) {
    if (this.upperLayer != null) {
      this.upperLayer.destroy(error);
    }

    internalDestroy(this, error);
  }

  forward(data, info, context) {
    if (this.upperLayer != null) {
      return Layer.forwardTo(this.upperLayer, data, info, context, this);
    }
    throw new Error('No layer to forward to');
    // return undefined;
  }

  static forwardTo(layer, data, info, context, fromLayer) {
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

  static handleData(layer, data, info, context, fromLayer) {
    layer.emit('data', data, info, context);
    if (LOG) {
      console.log(`${fromLayer.name} -> ${layer.name}`);
      console.log(data);
      console.log('');
    }
    layer.handleData(data, info, context);
  }

  send(message, info, priority, context) {
    this.emit('send', message, info, priority, context);
    const transport = this.lowerLayer != null ? this.lowerLayer : this;

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

  requestQueueSize(priority) {
    return this._queue.size(priority);
  }

  hasRequest(priority) {
    return this.requestQueueSize(priority) > 0;
  }

  getAllRequests() {
    return this._queue.dequeue(true);
  }

  getNextRequest(peek) {
    if (peek === true) {
      return this._queue.peek();
    }
    return this._queue.dequeue();
  }

  clearRequestQueue() {
    this._queue.clear();
  }

  iterateRequestQueue(cb) {
    this._queue.iterate(cb);
  }

  contextCallback(callback, contextOrModifier, timeout) {
    // caller can pass their own context (e.g. PCCCLayer passes the transaction)
    if (typeof callback !== 'function') {
      throw new Error(`callback must be a function, received: ${typeof callback}`);
    }

    let context;
    let contextModifier;
    if (typeof contextOrModifier === 'function') {
      contextModifier = contextOrModifier;
    } else {
      context = contextOrModifier;
    }
    if (context == null) {
      context = this.contextGenerator(this);
    }
    if (contextModifier) {
      context = contextModifier(context);
    }

    this.__contextToCallback.set(context, callback);

    if (timeout != null && timeout > 0) {
      const timeoutHandle = setTimeout(() => {
        this.__contextToCallback.delete(context);
        callback(`Timeout (${timeout}ms)`);
      }, timeout);

      this.__contextToCallbackTimeouts.set(context, timeoutHandle);
    }

    return context;
  }

  callbackForContext(context) {
    if (this.__contextToCallback.has(context)) {
      const callback = this.__contextToCallback.get(context);
      this.__contextToCallback.delete(context);

      if (this.__contextToCallbackTimeouts.has(context)) {
        const timeoutHandle = this.__contextToCallbackTimeouts.get(context);
        clearTimeout(timeoutHandle);
        this.__contextToCallbackTimeouts.delete(context);
      }
      return callback;
    }
    return undefined;
  }

  setContextForID(id, context) {
    if (id != null) {
      this.__idContext.set(id, context);
      return true;
    }
    return false;
  }

  getContextForID(id, keep) {
    if (this.__idContext.has(id)) {
      const context = this.__idContext.get(id);
      if (keep !== true) {
        this.__idContext.delete(id);
      }
      return context;
    }
    return undefined;
  }

  clearContexts() {
    const entries = this.__idContext.entries();
    this.__idContext.clear();
    return entries;
  }
}
