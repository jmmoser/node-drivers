/**
 * MultiplexLayer utitlizes the info field of messages to multiplex messages from
 * multiple upper layers to one lower layer
 */

import { CallbackPromise } from '../utils';
import Layer from './layer';
import CreateCounter, { Counter } from '../counter';

function layerContext(self: MultiplexLayer, layer: Layer, context: number) {
  if (layer != null) {
    if (context == null) {
      context = self.__counter();
    }
    self.__contextToLayer.set(context, layer);
  }
  return context;
}

function layerForContext(self: MultiplexLayer, context: number) {
  let layer = null;
  if (self.__contextToLayer.has(context)) {
    layer = self.__contextToLayer.get(context);
    self.__contextToLayer.delete(context);
  }
  return layer;
}

export default class MultiplexLayer extends Layer {
  _layers: Set<Layer>;
  __counter: Counter;
  __contextToLayer: Map<number, Layer>;
  _disconnecting: number;

  constructor(lowerLayer: Layer) {
    super('multiplex', lowerLayer, {
      handlesForwarding: true,
    });

    this._layers = new Set();
    this.__counter = CreateCounter({ maxValue: 0x100000000 });
    this.__contextToLayer = new Map();
    this._disconnecting = 0;
  }

  layerAdded(layer: Layer) {
    this._layers.add(layer);
  }

  disconnect(callback?: Function) {
    return CallbackPromise(callback, async (resolver) => {
      if (this._disconnecting === 1) {
        resolver.resolve();
      }

      this._disconnecting = 1;

      const disconnectTimeout = setTimeout(() => {
        this._disconnecting = 0;
        resolver.resolve();
      }, 10000);

      await Promise.all([...this._layers].map((layer) => layer.disconnect()));

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
      this.send(request.message, request.info, false, layerContext(this, request.layer, request.context));
    }
  }

  handleData(data: Buffer, info: any, context: number) {
    if (context != null) {
      const layer = layerForContext(this, context);
      if (layer != null) {
        Layer.forwardTo(layer, data, info, context, this);
      } else {
        throw new Error(`MultiplexLayer Error: No layer for context: ${context}`);
      }
    } else {
      throw new Error('MultiplexLayer Error: No context');
    }
  }

  handleDestroy(error: Error) {
    [...this._layers].forEach((layer) => {
      layer.destroy(error);
    });
  }
}
