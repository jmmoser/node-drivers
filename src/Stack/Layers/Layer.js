'use strict';

const Queueable = require('./../../Classes/Queueable');
const Packetable = require('./../../Classes/Packetable');

class Layer extends Queueable {
  constructor(lowerLayer) {
    super();

    this.lowerLayer = lowerLayer;
    if (lowerLayer) lowerLayer.upperLayer = this;
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

  forwardToUpperLayer(data, info) {
    if (this.upperLayer) {
      this.upperLayer.handleData(data, info);
    }
  }

  send(message, info, priority) {
    let transport = this.lowerLayer ? this.lowerLayer : this;

    transport.addMessageToQueue(message, info, priority);
    transport.sendNextMessage();
  }

  getNextRequest() {
    return this.getNext();
  }

  addMessageToQueue(message, info, priority) {
    let obj = {
      message: message,
      info: info || {}
    };

    this.addToQueue(obj, priority);
  }
}

Layer.Queueable = Queueable;
Layer.Packetable = Packetable;

module.exports = Layer;
