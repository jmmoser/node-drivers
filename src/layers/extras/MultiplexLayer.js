'use strict';

/**
 * MultiplexLayer utitlizes the info field of messages to multiplex messages from
 * multiple upper layers to one lower layer
 */

const { CallbackPromise } = require('../../utils');
const Layer = require('../Layer');


class MultiplexLayer extends Layer {
  constructor(lowerLayer) {
    super('multiplex', lowerLayer, {
      handlesForwarding
    });
    
    this._layers = new Set();
    this.__context = 0;
    this.__contextToLayer = new Map();
  }

  layerAdded(layer) {
    this._layers.add(layer);
  }

  disconnect(callback) {
    return CallbackPromise(callback, async resolver => {
      if (this._disconnecting === 1) {
        resolver.resolve();
      }

      this._disconnecting = 1;
      
      const disconnectTimeout = setTimeout(() => {
        this._disconnecting = 0;
        console.log('disconnect timeout');
        resolver.resolve();
      }, 10000);

      await Promise.all([...this._layers].map(layer => layer.disconnect()));

      if (this._disconnecting === 1) {
        clearTimeout(disconnectTimeout);
        this._disconnecting = 0;
        resolver.resolve();
      }
    });
  }

  sendNextMessage() {
    const request = this.getNextRequest();
    if (request != null) {
      this.send(request.message, request.info, false, layerContext(this, request.layer));
      setImmediate(() => this.sendNextMessage());
    }
  }

  handleData(data, info, context) {
    if (context != null) {
      const layer = layerForContext(this, context);
      if (layer != null) {
        this.forwardTo(layer, data, info);
      } else {
        throw new Error('MultiplexLayer Error: No layer for context: ' + context);
      }
    } else {
      throw new Error('MultiplexLayer Error: No context');
    }
  }

  handleDestroy(error) {
    [...this._layers].forEach(layer => {
      layer.destroy(error);
    });
  }

  
}

module.exports = MultiplexLayer;


function layerContext(self, layer, context) {
  if (layer != null) {
    if (context == null) {
      context = incrementContext(this);
    }
    self.__contextToLayer.set(context, layer);
  }
  return context;
}

function layerForContext(self, context) {
  let layer = null;
  if (self.__contextToLayer.has(context)) {
    layer = self.__contextToLayer.get(context);
    self.__contextToLayer.delete(context);
  }
  return layer;
}

function incrementContext(self) {
  self.__context = (self.__context + 1) % 0x100000000;
  return self.__context;
}