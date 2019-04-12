'use strict';

const Layer = require('./Objects/CIPLayer');
const MessageRouter = require('./Objects/MessageRouter');


class PCCC extends Layer {
  constructor(lowerLayer, options) {
    super(lowerLayer);
    options = options || {};
    this.options = {
      vendorID: options.vendorID || 0x0001,
      serialNumber: options.serialNumber || 0x01020304
    };
  }

  sendNextMessage() {
    const request = this.getNextRequest();
    if (request != null) {
      const HEADER_LENGTH = 7;
      const header = Buffer.alloc(HEADER_LENGTH);
      header.writeUInt8(HEADER_LENGTH, 0);
      header.writeUInt16LE(this.options.vendorID, 1);
      header.writeUInt32LE(this.options.serialNumber, 3);

      const pcccMessage = request.message;

      const data = Buffer.concat([header, pcccMessage], HEADER_LENGTH + pcccMessage.length);

      const message = MessageRouter.Request(
        Services.ExecutePCCC,
        PCCC.Path,
        data
      );

      this.send(message, null, false);

      setImmediate(() => this.sendNextMessage());
    }
  }

  handleData(data, info, context) {
    const offset = data.readUInt8(4);
    this.forward(data.slice(offset + 4));
  }
}

const Services = {
  ExecutePCCC: 0x4B
};

PCCC.Path = Buffer.from([
  0x20,
  0x67, // PCCC object
  0x24,
  0x01
]);

module.exports = PCCC;
