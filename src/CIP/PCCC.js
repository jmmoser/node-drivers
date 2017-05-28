'use strict';

// const CIPObject = require('./Objects/CIPObject');
// const PCCCPacket = require('./../Stack/Packets/PCCCPacket');

const MessageRouter = require('./Objects/MessageRouter');


const Layer = require('./../Stack/Layers/Layer');

// option properties
// - vendor (UINT): Vendor number of requestor
// - serialNumber (UDINT): CIP Serial number of requestor

// class PCCC {
class PCCC extends Layer {
  constructor(cipLayer, options) {
    // super(cipLayer, options);
    super(); // no lower layer (uses CIPLayer as lower layer)

    // this.layer = new Layer(
    //   null,
    //   this.sendNextMessage.bind(this),
    //   this.handleData.bind(this)
    // );

    cipLayer.addObject(this);

    // this.cipLayer = cipLayer;

    this._mergeOptions(options);
  }

  // disconnect(callback) {
  //   if (callback) callback();
  // }

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
        // console.log('');
        // console.log('PCCC:');
        // console.log(data);
        let offset = data.readUInt8(4);

        self.forward(data.slice(offset + 4));

        // let reply = PCCCPacket.fromBufferReply(data);
        // let value = PCCCPacket.ParseTypedReadData(reply.Data);
        // if (Array.isArray(value) && value.length > 0) {
        //   callback(null, value[0]);
        // } else {
        //   callback(null, null);
        // }
      });
    }
  }

  // typedRead(address, callback) {
  //   if (callback) {
  //     let transaction = this._incrementTransaction();
  //
  //     let message = PCCCPacket.TypedReadRequest(transaction, address, 1);
  //
  //     this.cipLayer.sendUnconnected(message, function(data) {
  //       let reply = PCCCPacket.fromBufferReply(data);
  //       let value = PCCCPacket.ParseTypedReadData(reply.Data);
  //       if (Array.isArray(value) && value.length > 0) {
  //         callback(null, value[0]);
  //       } else {
  //         callback(null, null);
  //       }
  //     });
  //   }
  // }
  //
  // typedWrite(address, value, callback) {
  //   if (callback) {
  //     let transaction = this.incrementTransaction();
  //     let message = PCCCPacket.TypedWriteRequest(transaction, address, [value]);
  //
  //     // console.log(message);
  //     // callback(null, null);
  //     // return;
  //
  //     this.cipLayer.sendUnconnected(message, function(data) {
  //       let reply = PCCCPacket.fromBufferReply(data);
  //
  //       callback(reply.additionalStatus, reply);
  //     });
  //   }
  // }
}

module.exports = PCCC;
