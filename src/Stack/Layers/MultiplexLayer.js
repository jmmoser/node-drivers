'use strict';

/*
  This layer utitlizes the info field of messages to multiplex messages from
  multiple upper layers to one lower layer
*/

const Layer = require('./Layer');

class MultiplexLayer extends Layer {
  constructor(lowerLayer) {
    super(lowerLayer, true);

    this._context = 0;
    this._callbacks = new Map();

    this._layers = new Set();
  }

  layerAdded(layer) {
    this._layers.add(layer);
  }

  disconnect(callback) {
    if (this._disconnecting === 1) return;

    let self = this;

    self._disconnecting = 1;
    self._disconnectCount = 0;

    self._disconnectTimer = setTimeout(function() {
      self._disconnecting = 0;
      console.log('disconnect timeout');
      if (callback != null) callback();
    }, 10000);

    let objectCount = self._layers.size;

    let layerDisconnectCallback = function() {
      if (self._disconnecting === 0) return;

      self._disconnectCount++;
      if (self._disconnectCount >= objectCount) {
        clearTimeout(self._disconnectTimer);
        self._disconnecting = 0;

        if (callback != null) {
          callback();
        }
      }
    };

    self._layers.forEach(function(layer) {
      layer.disconnect(layerDisconnectCallback);
    });
  }

  sendNextMessage() {
    let request = this.getNextRequest();

    if (request) {
      // let message = request.message;
      // let layer = request.layer;
      //
      // if (request.info.expectsResponse === true) {
      //   let context = this._incrementContext();
      //   this._callbacks.set(context, layer);
      // }
      //
      // this.send(message, info, false);

      // this.send(request.message, request.info, false, this.contextCallback(function(data, info, context)) {
      //   this.forwardTo(request.layer, data, info, context);
      // });

      this.send(request.message, request.info, false, this.layerContext(request.layer));

      this.sendNextMessage();
    }
  }

  handleData(data, info, context) {
    // let context = info.context;
    // if (context != null) {
    //   if (this._callbacks.has(context) === true) {
    //     let layer = this._callbacks.get(context);
    //     this._callbacks.delete(context);
    //     this.fowardTo(layer, data, info);
    //   } else {
    //     throw new Error('MultiplexLayer Error: callbacks does not contain context');
    //   }
    // } else {
    //   throw new Error('MultiplexLayer Error: info does not contain context');
    // }

    if (context != null) {
      // let callback = this.getCallbackForContext(context);
      let layer = this.layerForContext(context);

      if (layer != null) {
        this.forwardTo(layer, data, info);
      } else {
        throw new Error('MultiplexLayer Error: No layer for context: ' + context);
      }
    } else {
      // console.log(data);
      // console.log(info);
      throw new Error('MultiplexLayer Error: No context');
    }
  }

  _incrementContext() {
    this._context = (this._context + 1) % 0x10000;
    return this._context;
  }
}

module.exports = MultiplexLayer;
