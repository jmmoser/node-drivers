'use strict';

const Queueable = require('./../../Classes/Queueable');
const Packetable = require('./../../Classes/Packetable');
const Defragable = require('./../../Classes/Defragable');

// class Layer extends Queueable {

  // constructor(lowerLayer) {
  //   super();
  //
  //   this.lowerLayer = lowerLayer;
  //   if (lowerLayer) lowerLayer.upperLayer = this;
  // }

class Layer {
  constructor(lowerLayer, sendNextMessage, handleData, disconnect) {
    this._queue = new Queueable();

    this.lowerLayer = lowerLayer;
    if (lowerLayer) lowerLayer.upperLayer = this;
  }

  // constructor(lowerLayer, sendNextMessage, handleData, disconnect) {
  //   this._queue = new Queueable();
  //
  //   this.lowerLayer = lowerLayer;
  //   if (lowerLayer) lowerLayer.upperLayer = this;
  //
  //
  //   this.sendNextMessage = sendNextMessage || function() {
  //
  //   };
  //
  //   this.handleData = handleData || function(data) {
  //
  //   };
  //
  //   this.disconnect = disconnect || function(callback) {
  //     if (callback) callback();
  //   };
  // }

  setDefragger(isCompleteFunc, lengthCallbackFunc) {
    this._defragger = new Defragable(isCompleteFunc, lengthCallbackFunc);
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

  // forwardToUpperLayer(data, info) {
  forward(data, info) {
    if (this.upperLayer) {
      // this.upperLayer.handleData(data, info);
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
Layer.Packetable = Packetable;

module.exports = Layer;
