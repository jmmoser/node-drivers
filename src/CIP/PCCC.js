'use strict';

const CIPLayer = require('./Objects/CIPLayer');

const HEADER_LENGTH = 7;

class PCCC extends CIPLayer {
  constructor(lowerLayer, options) {
    super(lowerLayer);

    this.options = Object.assign({
      vendorID: 0x0001,
      serialNumber: 0x01020304
    }, options);
    
    const header = Buffer.alloc(HEADER_LENGTH);
    header.writeUInt8(HEADER_LENGTH, 0);
    header.writeUInt16LE(this.options.vendorID, 1);
    header.writeUInt32LE(this.options.serialNumber, 3);

    this.header = header;
  }

  sendNextMessage() {
    let request;
    while ((request = this.getNextRequest())) {
      const pcccMessage = request.message;

      const data = Buffer.concat(
        [this.header, pcccMessage],
        HEADER_LENGTH + pcccMessage.length
      );

      send(this, Services.ExecutePCCC, data);
    }
  }

  handleData(data, info, context) {
    const offset = data.readUInt8(4);
    this.forward(data.slice(offset + 4), info, context);
  }
}


const PCCC_EPATH = Buffer.from([
  0x20, // Logical Segment - Class ID
  0x67, // PCCC object
  0x24, // Logical Segment - Instance ID
  0x01
]);

/** Use driver specific error handling if exists */
function send(self, service, data) {
  return CIPLayer.send(self, false, service, PCCC_EPATH, data);
}
// function send(self, service, data, callback, timeout) {
//   return CIPLayer.send(self, false, service, PCCC_EPATH, data, (error, reply) => {
//     callback(error, reply);
//   }, timeout);
// }


const Services = {
  ExecutePCCC: 0x4B
};


module.exports = PCCC;
