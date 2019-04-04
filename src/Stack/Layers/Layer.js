'use strict';

const Queue = require('../../Classes/Queue');
const Defragger = require('../../Classes/Defragger');
const { CallbackPromise } = require('../../util');


class Layer {
  constructor(lowerLayer, handlesForwarding) {
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
    this.__callbacks = new Map();

    this.__contextToLayer = new Map();
  }

  setDefragger(isCompleteFunc, lengthCallbackFunc) {
    this._defragger = new Defragger(isCompleteFunc, lengthCallbackFunc);
    return this;
  }

  _handleData(data, info, context) {
    if (this._defragger != null) {
      data = this._defragger.defrag(data);
      if (data == null) return;
    }

    this.handleData(data, info, context);
  }

  disconnect(callback) {
    // IMPLEMENT IN SUBCLASS IF NEEDED
    // if (callback != null) callback();

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

  // connected() {
  //   // IMPLEMENT IN SUBCLASS
  // }

  // sendNextMessage() {
  //   // IMPLEMENT IN SUBCLASS
  // }

  // handleData(data) {
  //   // IMPLEMENT IN SUBCLASS
  // }

  close(callback) {
    return CallbackPromise(callback, async resolver => {
      if (this.upperLayer != null) {
        await this.upperLayer.close();
      }
      await this.disconnect();
      resolver.resolve();
    });
  }

  // close(callback) {
  //   const self = this;
  //   if (self.upperLayer != null) {
  //     self.upperLayer.close(function() {
  //       self.disconnect(callback);
  //     });
  //   } else {
  //     self.disconnect(callback);
  //   }
  // }

  forward(data, info, context) {
    if (this.upperLayer != null) {
      this.forwardTo(this.upperLayer, data, info, context);
    }
  }

  forwardTo(layer, data, info, context) {
    layer._handleData(data, info, context);
  }

  send(message, info, priority, context) {
    const transport = this.lowerLayer != null ? this.lowerLayer : this;

    transport.addMessageToQueue(this, message, info, priority, context);
    transport.sendNextMessage();
  }

  getNextRequest() {
    return this._queue.getNext();
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

  __incrementContext() {
    this.__context = (this.__context + 1) % 0x100000000;
    return this.__context;
  }

  contextCallback(callback, context) {
    // caller can pass their own context (e.g. PCCCLayer passes the transaction)
    if (callback != null) {
      if (context == null) {
        context = this.__incrementContext();
      }
      this.__callbacks.set(context, callback);
    }
    return context;
  }

  getCallbackForContext(context) {
    let callback = null;
    if (this.__callbacks.has(context)) {
      callback = this.__callbacks.get(context);
      this.__callbacks.delete(context);
    }
    return callback;
  }

  layerContext(layer, context) {
    if (layer != null) {
      if (context == null) {
        context = this.__incrementContext();
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


