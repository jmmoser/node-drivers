'use strict';

const Layer = require('./../Stack/Layers/Layer');
const MessageRouter = require('./Objects/MessageRouter');

class PCCC extends Layer {
  constructor(lowerLayer, options) {
    super(lowerLayer);
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

      let message = MessageRouter.Request(
        PCCC.SERVICES.ExecutePCCC,
        PCCC.Path,
        data
      );

      this.send(message, null, false);
    }
  }

  handleData(data, info, context) {
    let offset = data.readUInt8(4);
    this.forward(data.slice(offset + 4));
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
