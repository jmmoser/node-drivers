'use strict';

const Layer = require('./Layer');
const PCCCPacket = require('./../Packets/PCCCPacket');

class PCCCLayer extends Layer {
  constructor(lowerLayer) {
    super(lowerLayer);

    this._callbacks = {};
    this._transaction = 0;
  }

  wordRangeRead(address, callback) {
    if (callback) {
      let transaction = this.incrementTransaction();
      this._callbacks[transaction] = function(error, packet) {
        if (error) {
          callback(error);
        } else {
          callback(null, packet.Data);
        }
      };
      let message = PCCCPacket.WordRangeReadRequest(transaction, address);
      this.send(message, false);
    }
  }

  typedRead(address, callback) {
    if (callback) {
      let transaction = this.incrementTransaction();
      this._callbacks[transaction] = function(error, packet) {
        console.log(packet);
        console.log(Buffer.from([packet.Service]));
        if (error) {
          callback(error);
        } else {
          let value = PCCCPacket.ParseTypedReadData(packet.Data);
          if (Array.isArray(value) && value.length > 0) {
            callback(null, value[0]);
          } else {
            callback(null, null);
          }
        }
      };
      let message = PCCCPacket.TypedReadRequest(transaction, address, 1);
      this.send(message, false);
    }
  }

  diagnosticStatus(callback) {
    if (callback) {
      let transaction = this.incrementTransaction();
      this._callbacks[transaction] = function(error, packet) {
        if (error) {
          callback(error);
        } else {
          callback(null, packet.Data);
        }
      };

      let message = PCCCPacket.DiagnosticStatusRequest(transaction);
      this.send(message, false);
    }
  }



  handleData(data) {
    let packet = PCCCPacket.fromBufferReply(data);

    if (this._callbacks[packet.Transaction]) {
      this._callbacks[packet.Transaction]
      let callback = this._callbacks[packet.Transaction];
      delete this._callbacks[packet.Transaction];
      callback(getError(packet), packet);
    } else {
      console.log('PCCC Error: Unhandled packet:');
      console.log(packet);
      console.log(this._callbacks);
    }
  }

  incrementTransaction() {
    this._transaction++;
    return this._transaction;
  }
}

module.exports = PCCCLayer;

function getError(packet) {
  if (packet.Status === 0) return null;

  if (packet.ExtendedStatusDescription)
    return packet.ExtendedStatusDescription;

  return packet.StatusDescription;
}
