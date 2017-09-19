'use strict';

const Queue = require('./../../Classes/Queueable');
const Defragger = require('./../../Classes/Defragger');

class Layer {
  // Layer Adder is used for layers that can have more than one upper layer (CIP)
  // constructor(lowerLayer, layerAdder) {
  //   this._queue = new Queue();
  //
  //   this.lowerLayer = lowerLayer;
  //   this._layerAdder = layerAdder;
  //
  //   if (lowerLayer != null) {
  //     if (lowerLayer._layerAdder != null) {
  //       lowerLayer._layerAdder.call(lowerLayer, this);
  //     } else {
  //       lowerLayer.upperLayer = this;
  //     }
  //   }
  // }
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

    // this.__contexts = new Map();
    this.__context = 0;
    this.__callbacks = new Map();

    this.__maps = {};

    this.__contextToLayer = new Map();
  }

  initializeMap(name) {
    this.__maps[name] = new Map();
  }

  setDefragger(isCompleteFunc, lengthCallbackFunc) {
    this._defragger = new Defragger(isCompleteFunc, lengthCallbackFunc);
    return this;
  }

  setFormatter(formatter) {
    this._formatter = formatter;
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
    if (callback != null) callback();
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
    let self = this;
    if (self.upperLayer != null) {
      self.upperLayer.close(function() {
        self.disconnect(callback);
      });
    } else {
      self.disconnect(callback);
    }
  }

  forward(data, info, context) {
    if (this.upperLayer != null) {
      this.forwardTo(this.upperLayer, data, info, context);
    }
  }

  forwardTo(layer, data, info, context) {
    // let context = info.__context;
    // if (context != null && this.__contexts.has(context)) {
    //   let callback = this._contexts.get(context);
    //   this._contexts.delete(context);
    //   callback(data, info);
    // } else {
    //   layer._handleData(data, info);
    // }

    layer._handleData(data, info, context);
  }

  send(message, info, priority, context) {
    // if (info == null) {
    //   info = {};
    // }
    //
    // if (callback != null) {
    //   let context = this.__incrementContext();
    //   info.__context = context;
    //   this.__contexts.set(context, callback);
    // }

    let transport = this.lowerLayer != null ? this.lowerLayer : this;

    transport.addMessageToQueue(this, message, info, priority, context);
    transport.sendNextMessage();
  }

  getNextRequest() {
    return this._queue.getNext();
  }

  addMessageToQueue(requestingLayer, message, info, priority, context) {
    let obj = {
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

  // setCallbackForContext(context, callback) {
  //   if (context != null && callback != null) {
  //     this.__callbacks.set(context, callback);
  //   }
  // }

  contextCallback(callback) {
    let context = null;
    if (callback != null) {
      context = this.__incrementContext();
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

  layerContext(layer) {
    let context = null;
    if (layer != null) {
      context = this.__incrementContext();
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

Layer.Queueable = Queue;

module.exports = Layer;

class CCallback {
  constructor(context, callback) {
    this.context = context;
    this.callback = callback;
  }
}

module.exports.CCallback = CCallback;
