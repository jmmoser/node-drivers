'use strict';

const EventEmitter = require('events');
const Queue = require('../../Classes/Queue');
const Defragger = require('../../Classes/Defragger');
const { CallbackPromise } = require('../../util');


class Layer extends EventEmitter {
  constructor(lowerLayer, handlesForwarding) {
    super();

    this._queue = new Queue();

    this.lowerLayer = lowerLayer;

    this.handlesForwarding = handlesForwarding === true ? true : false;

    if (lowerLayer != null) {
      if (lowerLayer.handlesForwarding !== true) {
        lowerLayer.upperLayer = this;
      }
      lowerLayer.layerAdded(this);
    }

    this.__context = 0;
    this.__contextToCallback = new Map();
    this.__contextToCallbackTimeouts = new Map();
    this.__contextToLayer = new Map();
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
      this.emit('close');
      resolver.resolve();
    });
  }


  destroy(error) {
    if (this.upperLayer != null) {
      this.upperLayer.destroy(error);
    }

    /** Clear all internal context callbacks */
    this.__contextToCallback.forEach(cb => {
      cb(error);
    });
    this.__contextToCallback.clear();

    this.handleDestroy(error);
  }


  forward(data, info, context) {
    if (this.upperLayer != null) {
      this.forwardTo(this.upperLayer, data, info, context);
    }
  }

  forwardTo(layer, data, info, context) {
    this.emit('data', data, info, context);
    internalHandleData(layer, data, info, context);
  }

  send(message, info, priority, context) {
    this.emit('send', message, info, priority, context);
    const transport = this.lowerLayer != null ? this.lowerLayer : this;
    transport.addMessageToQueue(this, message, info, priority, context);
    transport.sendNextMessage();
  }

  hasRequest() {
    return this._queue.hasNext();
  }

  getNextRequest(peek) {
    if (peek === true) {
      return this._queue.peek();
    }
    return this._queue.shift();
  }

  addMessageToQueue(requestingLayer, message, info, priority, context) {
    const obj = {
      layer: requestingLayer,
      message: message,
      info: info || {},
      context: context
    };

    this._queue.addToQueue(obj, priority);
  }


  contextCallback(callback, context, timeout) {
    // caller can pass their own context (e.g. PCCCLayer passes the transaction)
    if (typeof callback === 'function') {
      if (context == null) {
        context = incrementContext(this);
      }
      this.__contextToCallback.set(context, callback);

      if (timeout != null && timeout > 0) {
        const timeoutHandle = setTimeout(() => {
          this.__contextToCallback.delete(context);
          callback('Timeout');
        }, timeout);

        this.__contextToCallbackTimeouts.set(context, timeoutHandle);
      }
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

  // contextCallback(callback, context) {
  //   // caller can pass their own context (e.g. PCCCLayer passes the transaction)
  //   if (callback != null) {
  //     if (context == null) {
  //       context = incrementContext(this);
  //     }
  //     this.__contextToCallback.set(context, callback);
  //   }
  //   return context;
  // }

  // callbackForContext(context) {
  //   let callback = null;
  //   // console.log(`CallbackForContext: ${context}`);
  //   if (this.__contextToCallback.has(context)) {
  //     callback = this.__contextToCallback.get(context);
  //     // console.log('')
  //     // console.log('deleting');
  //     // console.log(this.__contextToCallback)
  //     this.__contextToCallback.delete(context);
  //     // console.log(this.__contextToCallback)
  //     // console.log('')
  //   }
  //   return callback;
  // }

  layerContext(layer, context) {
    if (layer != null) {
      if (context == null) {
        context = incrementContext(this);
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

function internalHandleData(self, data, info, context) {
  if (self._defragger != null) {
    data = self._defragger.defrag(data);
    if (data == null) return;
  }
  self.handleData(data, info, context);
}