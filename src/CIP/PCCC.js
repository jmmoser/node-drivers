'use strict';

const Layer = require('./../Stack/Layers/Layer');
const MessageRouter = require('./Objects/MessageRouter');

// option properties
// - vendor (UINT): Vendor number of requestor
// - serialNumber (UDINT): CIP Serial number of requestor

class PCCC extends Layer {
  constructor(cipLayer, options) {
    // super(); // no lower layer (uses CIPLayer as lower layer)
    super(cipLayer);

    cipLayer.addObject(this);

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
    if (request) {
      // CIP/MessageRouter specific
      const service = 0x4B; // Execute PCCC service code
      const pathSize = 2;
      const path = Buffer.from([
        0x20,
        0x67, // PCCC object
        0x24,
        0x01
      ]);

      // 'Execute PCCC service' specific
      // length - USINT
      // Vendor - UINT
      // Serial Number - UDINT
      // Other - ARRAY of USINT
      let data = Buffer.alloc(7);
      data.writeUInt8(7, 0);
      data.writeUInt16LE(this.options.vendorID, 1);
      data.writeUInt32LE(this.options.serialNumber, 3);

      let pcccMessage = request.message;
      data = Buffer.concat([data, pcccMessage], 7 + pcccMessage.length);

      let message = MessageRouter.Request(service, path, data);

      let self = this;

      this._layer.sendUnconnected(message, function(data) {
        let offset = data.readUInt8(4);
        self.forward(data.slice(offset + 4));
      });
    }
  }
}

module.exports = PCCC;
