'use strict';

/**
 * MultiplexLayer utitlizes the info field of messages to multiplex messages from
 * multiple upper layers to one lower layer
 */

const Layer = require('../Layer');


class MultiplexLayer extends Layer {
  constructor(lowerLayer) {
    super('multiplex', lowerLayer, {
      handlesForwarding
    });
    
    this._layers = new Set();
  }

  layerAdded(layer) {
    this._layers.add(layer);
  }

  disconnect(callback) {
    return Layer.CallbackPromise(callback, async resolver => {
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


  // disconnect(callback) {
  //   if (this._disconnecting === 1) return;

  //   const self = this;

  //   self._disconnecting = 1;
  //   self._disconnectCount = 0;

  //   self._disconnectTimer = setTimeout(function() {
  //     self._disconnecting = 0;
  //     console.log('disconnect timeout');
  //     if (callback != null) callback();
  //   }, 10000);

  //   const objectCount = self._layers.size;

  //   const layerDisconnectCallback = function() {
  //     if (self._disconnecting === 0) return;

  //     self._disconnectCount++;
  //     if (self._disconnectCount >= objectCount) {
  //       clearTimeout(self._disconnectTimer);
  //       self._disconnecting = 0;

  //       if (callback != null) {
  //         callback();
  //       }
  //     }
  //   };

  //   self._layers.forEach(function(layer) {
  //     layer.disconnect(layerDisconnectCallback);
  //   });
  // }

  sendNextMessage() {
    const request = this.getNextRequest();
    if (request != null) {
      this.send(request.message, request.info, false, this.layerContext(request.layer));
      setImmediate(() => this.sendNextMessage());
    }
  }

  handleData(data, info, context) {
    if (context != null) {
      const layer = this.layerForContext(context);
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
