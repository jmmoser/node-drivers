'use strict';

const EventEmitter = require('events');
const Queue = require('../queue');
const Defragger = require('../defragger');
const { CallbackPromise } = require('../utils');


class Layer extends EventEmitter {
  constructor(name, lowerLayer, options, defaultOptions) {
    if (!name || typeof name !== 'string') {
      throw new Error('Layer name must be a non-empty string');
    }

    super();

    options = Object.assign({
      handlesForwarding: false,
      contextGenerator: incrementContext
    }, options);

    this._queue = new Queue();

    this.lowerLayer = lowerLayer;

    this.contextGenerator = options.contextGenerator;
    this.handlesForwarding = options.handlesForwarding === true;

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
    this._defragger = new Defragger(isCompleteFunc, lengthCallbackFunc);
    return this;
  }

  /** OVERRIDE IF NEEDED */
  handleDefaultOptions(defaultOptions, upperLayer) {

  }

  /** OVERRIDE IF NEEDED */
  disconnect(callback) {
    return CallbackPromise(callback, resolver => {
      resolver.resolve();
    });
  }

  /** OVERRIDE IF NEEDED */
  layerAdded(layer) {
    // Use in lower layers to handle additions of upper layers
    // Currently used in MultiplexLayer
  }

  /** OVERRIDE IF NEEDED */
  layerRemoved(layer) {
    // Use in lower layers to handle removals of upper layers
  }

  /** OVERRIDE */
  sendNextMessage() {
    
  }

  /** OVERRIDE */
  handleData(data) {

  }

  /** OVERRIDE IF NEEDED */
  handleDestroy(error) {

  }

  close(callback) {
    return CallbackPromise(callback, async resolver => {
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
      return this.forwardTo(this.upperLayer, data, info, context);
    }
  }

  forwardTo(layer, data, info, context) {
    if (layer._defragger != null) {
      data = layer._defragger.defrag(data);
      if (data == null) return;
    }
    layer.emit('data', data, info, context);
    return layer.handleData(data, info, context);
  }

  send(message, info, priority, context) {
    this.emit('send', message, info, priority, context);
    const transport = this.lowerLayer != null ? this.lowerLayer : this;
    transport.addMessageToQueue(this, message, info, priority, context);
    transport.sendNextMessage();
  }

  requestQueueSize(priority) {
    return this._queue.size(priority);
  }

  hasRequest(priority) {
    return this.requestQueueSize(priority) > 0;
  }

  getNextRequest(peek) {
    if (peek === true) {
      return this._queue.peek();
    }
    return this._queue.dequeue();
  }

  addMessageToQueue(requestingLayer, message, info, priority, context) {
    const obj = {
      layer: requestingLayer,
      message: message,
      info: info || {},
      context: context
    };

    this._queue.enqueue(obj, priority);
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

    let context, contextModifier;
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
  }

  clearContexts() {
    const entries = this.__idContext.entries();
    this.__idContext.clear();
    return entries;
  }
}


module.exports = Layer;


function passDefaultOptionsDown(defaultOptions, upperLayer) {
  let lowerLayer = upperLayer;
  while ((lowerLayer = lowerLayer.lowerLayer)) {
    const layerSpecificDefaultOptions = defaultOptions[lowerLayer.name];
    if (layerSpecificDefaultOptions) {
      lowerLayer.handleDefaultOptions(layerSpecificDefaultOptions, upperLayer);
    }
  }
}


function incrementContext(self) {
  self.__context = (self.__context + 1) % 0x100000000;
  return self.__context;
}


function internalDestroy(layer, error) {
  /** Clear all internal context callbacks */
  layer.__contextToCallbackTimeouts.forEach(handle => clearTimeout(handle));
  layer.__contextToCallbackTimeouts.clear();

  layer.__contextToCallback.forEach(cb => cb(error));
  layer.__contextToCallback.clear();
  
  layer.__idContext.clear();

  layer.clearRequestQueue();

  layer.handleDestroy(error);
}