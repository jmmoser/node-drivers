'use strict';

const Queueable = require('./../../Classes/Queueable');
const Defragger = require('./../../Classes/Defragger');
// const Packetable = require('./../../Classes/Packetable');

class Layer {
  constructor(lowerLayer, layerAdder) {
    this._queue = new Queueable();

    this.lowerLayer = lowerLayer;
    this._layerAdder = layerAdder;

    if (lowerLayer) {
      if (lowerLayer._layerAdder) {
        lowerLayer._layerAdder.call(lowerLayer, this);
      } else {
        lowerLayer.upperLayer = this;
      }
    }
  }

  setDefragger(isCompleteFunc, lengthCallbackFunc) {
    this._defragger = new Defragger(isCompleteFunc, lengthCallbackFunc);
    return this;
  }

  setFormatter(formatter) {
    this._formatter = formatter;
  }

  _handleData(data, info) {
    if (this._defragger) {
      data = this._defragger.defrag(data);
      if (!data) return;
    }

    this.handleData(data, info);
  }

  disconnect(callback) {
    // IMPLEMENT IN SUBCLASS IF NEEDED
    if (callback) callback();
  }

  // connected() {
  //   // IMPLEMENT IN SUBCLASS
  // }

  // sendNextMessage() {
  //   // IMPLEMENT IN SUBCLASS
  // }
  //
  // handleData(data) {
  //   // IMPLEMENT IN SUBCLASS
  // }

  close(callback) {
    let self = this;
    if (self.upperLayer) {
      self.upperLayer.close(function() {
        self.disconnect(callback);
      });
    } else {
      self.disconnect(callback);
    }
  }

  forward(data, info) {
    if (this.upperLayer) {
      this.upperLayer._handleData(data, info);
    }
  }

  send(message, info, priority) {
    let transport = this.lowerLayer ? this.lowerLayer : this;

    transport.addMessageToQueue(message, info, priority);
    transport.sendNextMessage();
  }

  getNextRequest() {
    return this._queue.getNext();
  }

  addMessageToQueue(message, info, priority) {
    let obj = {
      message: message,
      info: info || {}
    };

    this._queue.addToQueue(obj, priority);
  }
}

Layer.Queueable = Queueable;
// Layer.Packetable = Packetable;

module.exports = Layer;
