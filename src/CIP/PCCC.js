'use strict';

const CIPObject = require('./Objects/CIPObject');
const PCCCPacket = require('./../Stack/Packets/PCCCPacket');

class PCCC {
  constructor(layer, options) {
    this._transaction = 0;

    layer.addObject(this);
  }

  incrementTransaction() {
    this._transaction = (this._transaction + 1) % 0x10000;
    return this._transaction;
  }

  disconnect(callback) {
    if (callback) callback();
  }

  typedRead(address, callback) {
    if (callback) {
      let transaction = this.incrementTransaction();

      let message = PCCCPacket.TypedReadRequest(transaction, address, 1);

      this._layer.sendUnconnected(message, function(data) {
        let reply = PCCCPacket.fromBufferReply(data);

        let value = PCCCPacket.ParseTypedReadData(reply.Data);
        if (Array.isArray(value) && value.length > 0) {
          callback(null, value[0]);
        } else {
          callback(null, null);
        }
      });
    }
  }
}

module.exports = PCCC;
