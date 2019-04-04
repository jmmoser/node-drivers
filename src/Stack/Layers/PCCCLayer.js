'use strict';

// REF: CIP and PCCC v1.pdf

const Layer = require('./Layer');
const PCCCPacket = require('../Packets/PCCCPacket');

/*
  - Uses transactions to map responses to requests
  - Similar to EIPLayer, can directly use or use upper layers
*/

class PCCCLayer extends Layer {
  constructor(lowerLayer) {
    super(lowerLayer);

    this._transaction = 0;
  }

  wordRangeRead(address, callback) {
    return Layer.CallbackPromise(callback, resolver => {
      const transaction = this._incrementTransaction();
      const message = PCCCPacket.WordRangeReadRequest(transaction, address);

      this.send(message, null, false, this.contextCallback(function (data) {
        const reply = PCCCPacket.fromBufferReply(data);
        const error = getError(reply.status);
        if (error != null) {
          resolver.reject(error);
        } else {
          resolver.resolve(reply.Data);
        }
      }, transaction));
    });
  }

  typedRead(address, callback) {
    return Layer.CallbackPromise(callback, resolver => {
      const transaction = this._incrementTransaction();
      const message = PCCCPacket.TypedReadRequest(transaction, address, 1);

      this.send(message, null, false, this.contextCallback(function (data) {
        const reply = PCCCPacket.fromBufferReply(data);
        const error = getError(reply.status);
        if (error != null) {
          resolver.reject(error);
        } else {
          const value = PCCCPacket.ParseTypedReadData(reply.data);
          if (Array.isArray(value) && value.length > 0) {
            resolver.resolve(value[0]);
          } else {
            resolver.resolve(null);
          }
        }
      }, transaction));
    });
  }

  typedWrite(address, value, callback) {
    return Layer.CallbackPromise(callback, resolver => {
      const transaction = this._incrementTransaction();
      const message = PCCCPacket.TypedWriteRequest(transaction, address, [value]);

      this.send(message, null, false, this.contextCallback(function (data) {
        const reply = PCCCPacket.fromBufferReply(data);
        const error = getError(reply.status);
        if (error != null) {
          resolver.reject(error);
        } else {
          resolver.resolve(reply);
        }
      }, transaction));
    });
  }

  // unprotectedRead(address, size, callback) {
  //   if (callback == null) return;
  //
  //   if (size === 0 || size % 2 !== 0) {
  //     callback('size must be an even number');
  //     return;
  //   }
  //
  //   let transaction = this._incrementTransaction();
  //   let message = PCCCPacket.UnprotectedReadRequest(transaction, address, size);
  //
  //   this.send(message, null, false, this.contextCallback(function(data) {
  //     let reply = PCCCPacket.fromBufferReply(data);
  //     let error = getError(reply.status);
  //     if (error != null) {
  //       callback(error);
  //     } else {
  //       callback(null, reply);
  //     }
  //   }, transaction));
  // }

  diagnosticStatus(callback) {
    return Layer.CallbackPromise(callback, resolver => {
      const transaction = this._incrementTransaction();
      const message = PCCCPacket.DiagnosticStatusRequest(transaction);

      this.send(message, null, false, this.contextCallback(function (data) {
        const reply = PCCCPacket.fromBufferReply(data);
        const error = getError(reply.status);
        if (error) {
          resolver.reject(error);
        } else {
          resolver.resolve(reply.Data);
        }
      }, transaction));
    });
  }

  // wordRangeRead(address, callback) {
  //   if (callback == null) return;

  //   const transaction = this._incrementTransaction();
  //   const message = PCCCPacket.WordRangeReadRequest(transaction, address);

  //   this.send(message, null, false, this.contextCallback(function(data) {
  //     const reply = PCCCPacket.fromBufferReply(data);
  //     const error = getError(reply.status);
  //     if (error != null) {
  //       callback(error);
  //     } else {
  //       callback(null, reply.Data);
  //     }
  //   }, transaction));
  // }

  // typedRead(address, callback) {
  //   if (callback == null) return;

  //   const transaction = this._incrementTransaction();
  //   const message = PCCCPacket.TypedReadRequest(transaction, address, 1);

  //   this.send(message, null, false, this.contextCallback(function(data) {
  //     const reply = PCCCPacket.fromBufferReply(data);
  //     const error = getError(reply.status);
  //     if (error != null) {
  //       callback(error);
  //     } else {
  //       const value = PCCCPacket.ParseTypedReadData(reply.data);
  //       if (Array.isArray(value) && value.length > 0) {
  //         callback(null, value[0]);
  //       } else {
  //         callback(null, null);
  //       }
  //     }
  //   }, transaction));
  // }

  // typedWrite(address, value, callback) {
  //   if (callback == null) return;

  //   const transaction = this._incrementTransaction();
  //   const message = PCCCPacket.TypedWriteRequest(transaction, address, [value]);

  //   this.send(message, null, false, this.contextCallback(function(data) {
  //     const reply = PCCCPacket.fromBufferReply(data);
  //     const error = getError(reply.status);
  //     if (error != null) {
  //       callback(error);
  //     } else {
  //       callback(null, reply);
  //     }
  //   }, transaction));
  // }

  // // unprotectedRead(address, size, callback) {
  // //   if (callback == null) return;
  // //
  // //   if (size === 0 || size % 2 !== 0) {
  // //     callback('size must be an even number');
  // //     return;
  // //   }
  // //
  // //   let transaction = this._incrementTransaction();
  // //   let message = PCCCPacket.UnprotectedReadRequest(transaction, address, size);
  // //
  // //   this.send(message, null, false, this.contextCallback(function(data) {
  // //     let reply = PCCCPacket.fromBufferReply(data);
  // //     let error = getError(reply.status);
  // //     if (error != null) {
  // //       callback(error);
  // //     } else {
  // //       callback(null, reply);
  // //     }
  // //   }, transaction));
  // // }

  // diagnosticStatus(callback) {
  //   if (callback == null) return;

  //   const transaction = this._incrementTransaction();
  //   const message = PCCCPacket.DiagnosticStatusRequest(transaction);

  //   this.send(message, null, false, this.contextCallback(function(data) {
  //     const reply = PCCCPacket.fromBufferReply(data);
  //     const error = getError(reply.status);
  //     if (error) {
  //       callback(error);
  //     } else {
  //       callback(null, reply.Data);
  //     }
  //   }, transaction));
  // }

  // this is needed for sending CIP requests over PCCC
  sendNextMessage() {
    const request = this.getNextRequest();
    if (request != null) {
      // requests can either be
      // - unconnected (0x0B)
      // - connected (0x0A)

      // Fragmentation protocol is currently not supported

      let message = null;
      const transaction = this._incrementTransaction();

      if (request.info != null && request.info.connected === true) {
        const data = Buffer.alloc(6 + request.message.length);
        data.writeUInt8(0, 0); // FNC
        data.writeUInt8(0, 1); // Extra
        data.writeUInt16LE(request.info.connectionID, 2);
        data.writeUInt16LE(request.info.transportHeader, 4);
        request.message.copy(data, 6);
        message = this._packet(0x0A, 0, transaction, data);
      } else {
        const data = Buffer.alloc(2 + request.message.length);
        data.writeUInt8(0, 0); // FNC
        data.writeUInt8(0, 1); // Extra
        request.message.copy(data, 2);
        message = this._packet(0x0A, 0, transaction, data);
      }

      this.send(
        message,
        null,
        false,
        this.layerContext(request.layer, transaction)
      );

      this.sendNextMessage();
    }
  }

  _packet(command, status, transaction, data) {
    const buffer = Buffer.alloc(4 + data.length);
    buffer.writeUInt8(command, 0);
    buffer.writeUInt8(status, 1);
    buffer.writeUInt16LE(transaction, 2);
    data.copy(buffer, 4);
    return buffer;
  }


  handleData(data, info, context) {
    const packet = PCCCPacket.fromBufferReply(data);

    const callback = this.getCallbackForContext(packet.transaction);
    if (callback != null) {
      callback(data, info);
      return;
    }

    let layer = this.layerForContext(packet.transaction);
    if (layer != null) {
      this.forwardTo(layer, data, info, context);
      return;
    }

    throw new Error('PCCCLayer Error: No callback or layer for context (transaction)');
  }

  _incrementTransaction() {
    this._transaction++;
    return this._transaction % 0x10000;
  }
}

module.exports = PCCCLayer;

function getError(status) {
  if (status.code === 0) return null;

  if (status.extended.description != null && status.extended.description.length > 0)
    return status.extended.description;

  return status.description;
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
