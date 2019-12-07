'use strict';

const EventEmitter = require('events');
const Queue = require('../queue');
const Defragger = require('../defragger');
const { CallbackPromise } = require('../utils');


class Layer extends EventEmitter {
  constructor(name, lowerLayer, options) {
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

    if (lowerLayer != null) {
      if (lowerLayer.handlesForwarding !== true) {
        lowerLayer.upperLayer = this;
      }
      lowerLayer.layerAdded(this);
    }

    this.__name = name;
    this.__context = 0;
    this.__contextToCallback = new Map();
    this.__contextToCallbackTimeouts = new Map();
    this.__contextToLayer = new Map();
  }

  get name() {
    return this.__name;
  }

  setDefragger(isCompleteFunc, lengthCallbackFunc) {
    this._defragger = new Defragger(isCompleteFunc, lengthCallbackFunc);
    return this;
  }

  disconnect(callback) {
    // IMPLEMENT IN SUBCLASS IF NEEDED
    return CallbackPromise(callback, resolver => {
      resolver.resolve();
    });
  }

  layerAdded(layer) {
    // Use in lower layers to handle additions of upper layers
    // Currently used in MultiplexLayer
  }

  layerRemoved(layer) {
    // Use in lower layers to handle removals of upper layers
  }

  sendNextMessage() {
    // IMPLEMENT IN SUBCLASS
  }

  handleData(data) {
    // IMPLEMENT IN SUBCLASS
  }

  handleDestroy(error) {
    // IMPLEMENT IN SUBCLASS IF NEEDED
  }

  close(callback) {
    return CallbackPromise(callback, async resolver => {
      if (this.upperLayer != null) {
        await this.upperLayer.close();
      }
      
      await this.disconnect();

      /** Do not bubble up since close has already bubbled up */
      internalDestroy(this, 'Close');

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

    // return internalHandleData(layer, data, info, context);
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

  contextCallback(callback, context, timeout) {
    // caller can pass their own context (e.g. PCCCLayer passes the transaction)
    if (typeof callback === 'function') {
      if (context == null) {
        // context = incrementContext(this);
        context = this.contextGenerator(this);
      }
      this.__contextToCallback.set(context, callback);

      if (timeout != null && timeout > 0) {
        const timeoutHandle = setTimeout(() => {
          this.__contextToCallback.delete(context);
          callback('Timeout');
        }, timeout);

        this.__contextToCallbackTimeouts.set(context, timeoutHandle);
      }
    } else {
      throw new Error(`callback must be a function, received: ${typeof callback}`);
    }
    
    return context;
  }

  callbackForContext(context) {
    // console.log(`attempting callback for context: ${context}`);
    // console.log(this.__contextToCallback);
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

  layerContext(layer, context) {
    if (layer != null) {
      if (context == null) {
        // context = incrementContext(this);
        context = this.contextGenerator(this);
      }
      this.__contextToLayer.set(context, layer);
    }
    return context;
  }

  layerForContext(context) {
    let layer = null;
    if (this.__contextToLayer.has(context)) {
      layer = this.__contextToLayer.get(context);
      this.__contextToLayer.delete(context);
    }
    return layer;
  }
}

Layer.CallbackPromise = CallbackPromise;

module.exports = Layer;


function incrementContext(self) {
  self.__context = (self.__context + 1) % 0x100000000;
  return self.__context;
}


// function internalHandleData(self, data, info, context) {
//   if (self._defragger != null) {
//     data = self._defragger.defrag(data);
//     if (data == null) return;
//   }
//   self.emit('data', data, info, context);
//   return self.handleData(data, info, context);
// }


function internalDestroy(layer, error) {
  /** Clear all internal context callbacks */
  layer.__contextToCallback.forEach(cb => cb(error));
  layer.__contextToCallback.clear();

  layer.clearRequestQueue();

  layer.handleDestroy(error);
}