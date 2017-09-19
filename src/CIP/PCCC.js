'use strict';

const Layer = require('./../Stack/Layers/Layer');
const MessageRouter = require('./Objects/MessageRouter');

// Not directly used
// Unconnected sends to CIP Layer
class PCCC extends Layer {
  constructor(cipLayer, options) {
    super(cipLayer);
    this._layer = cipLayer;
    this._mergeOptions(options);
  }

  _mergeOptions(options) {
    options = options || {};
    this.options = {
      vendorID: options.vendorID || 0x0001,
      serialNumber: options.serialNumber || 0x01020304
    };
  }

  sendNextMessage() {
    let request = this.getNextRequest();
    if (request != null) {
      const HEADER_LENGTH = 7
      let data = Buffer.alloc(HEADER_LENGTH);
      data.writeUInt8(HEADER_LENGTH, 0);
      data.writeUInt16LE(this.options.vendorID, 1);
      data.writeUInt32LE(this.options.serialNumber, 3);

      let pcccMessage = request.message;
      let totalLength = HEADER_LENGTH + pcccMessage.length;

      data = Buffer.concat([data, pcccMessage], totalLength);

      let self = this;

      this._send(PCCC.SERVICES.ExecutePCCC, data, function(res) {
        let offset = res.readUInt8(4);
        self.forward(res.slice(offset + 4));
      });
    }
  }

  _send(code, data, cb) {
    let message = MessageRouter.Request(code, PCCC.Path, data);
    this._layer.sendUnconnected(message, cb);
  }
}

PCCC.SERVICES = {
  ExecutePCCC: 0x4B
};

PCCC.Path = Buffer.from([
  0x20,
  0x67, // PCCC object
  0x24,
  0x01
]);

module.exports = PCCC;
