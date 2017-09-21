'use strict';

// REF: CIP and PCCC v1.pdf

const Layer = require('./Layer');
const PCCCPacket = require('./../Packets/PCCCPacket');

/*
  - Uses transactions
  - Uses callbacks
*/

class PCCCLayer extends Layer {
  constructor(lowerLayer) {
    super(lowerLayer);

    this._callbacks = {};
    this._transaction = 0;
  }

  wordRangeRead(address, callback) {
    if (callback == null) return;

    let transaction = this._incrementTransaction();
    this._callbacks[transaction] = function(err, reply) {
      if (err) {
        callback(err);
      } else {
        callback(null, reply.Data);
      }
    };

    let message = PCCCPacket.WordRangeReadRequest(transaction, address);
    this.send(message, false);
  }

  typedRead(address, callback) {
    if (callback == null) return;

    let transaction = this._incrementTransaction();
    this._callbacks[transaction] = function(err, reply) {
      if (err) {
        callback(err);
      } else {
        let value = PCCCPacket.ParseTypedReadData(reply.data);
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

  typedWrite(address, value, callback) {
    if (callback == null) return;

    let transaction = this._incrementTransaction();
    this._callbacks[transaction] = function(err, reply) {
      if (err) {
        callback(err, null);
      } else {
        callback(reply.additionalStatus, reply);
      }
    };

    let message = PCCCPacket.TypedWriteRequest(transaction, address, [value]);
    this.send(message, false);
  }

  diagnosticStatus(callback) {
    if (callback == null) return;

    let transaction = this._incrementTransaction();
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

  // this is needed for sending CIP requests over PCCC
  sendNextMessage() {
    let request = this.getNextRequest();
    if (request != null) {
      // requests can either be
      // - unconnected (0x0B)
      // - connected (0x0A)

      // Fragmentation protocol is currently not supported

      let message = null;
      let transaction = this._incrementTransaction();

      if (request.info != null && request.info.connected === true) {
        let data = Buffer.alloc(6 + request.message.length);
        data.writeUInt8(0, 0); // FNC
        data.writeUInt8(0, 1); // Extra
        data.writeUInt16LE(request.info.connectionID, 2);
        data.writeUInt16LE(request.info.transportHeader, 4);
        request.message.copy(data, 6);
        message = this._packet(0x0A, 0, transaction, data);
      } else {
        let data = Buffer.alloc(2 + request.message.length);
        data.writeUInt8(0, 0); // FNC
        data.writeUInt8(0, 1); // Extra
        request.message.copy(data, 2);
        message = this._packet(0x0A, 0, transaction, data);
      }

      this.send(message, null, false);

      this.sendNextMessage();
    }
  }

  _packet(command, status, transaction, data) {
    let buffer = Buffer.alloc(4 + data.length);
    buffer.writeUInt8(command, 0);
    buffer.writeUInt8(status, 1);
    buffer.writeUInt16LE(transaction, 2);
    data.copy(buffer, 4);
    return buffer;
  }


  handleData(data) {
    let packet = PCCCPacket.fromBufferReply(data);

    if (this._callbacks[packet.transaction]) {
      let callback = this._callbacks[packet.transaction];
      delete this._callbacks[packet.transaction];
      callback(getError(packet), packet);
    } else {
      console.log('PCCC Error: Unhandled packet:');
      console.log(packet);
      console.log(this._callbacks);
    }
  }

  _incrementTransaction() {
    this._transaction++;
    return this._transaction % 0x10000;
  }
}

module.exports = PCCCLayer;

function getError(packet) {
  if (packet.status === 0) return null;

  if (packet.extendedStatusDescription)
    return packet.extendedStatusDescription;

  return packet.statusDescription;
}

/*
  PLC-2 Communication Commands
    -Uprotected Read
    -Protected Write
    -Uprotected Write
    -Protected Bit Write
    -Unprotected Bit Write

  PLC-5 Communication Commands
    -Read MOdify Write
    -Read Modify Write N
    -Typed Read
    -Typed Write
    -Word Range Read
    -Word Range Write
    -Bit Write

  SLC Communication Commands
    -SLC Protected Typed Logical Read with 3 Address Fields
    -SLC Protected Typed Logical Write with 3 Address Fields
    -SLC Protected Typed Logical Read with 2 Address Fields
    -SLC Protected Typed Logical Write with 2 Address Fields
*/
