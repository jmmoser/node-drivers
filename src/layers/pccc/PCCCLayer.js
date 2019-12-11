'use strict';

// REF: CIP and PCCC v1.pdf

const { CallbackPromise } = require('../../utils');
const Layer = require('../Layer');
const PCCCPacket = require('./PCCCPacket');

/*
  - Uses transactions to map responses to requests
  - Similar to EIPLayer, can directly use or use upper layers
*/

class PCCCLayer extends Layer {
  constructor(lowerLayer) {
    super('pccc', lowerLayer);
    this._transaction = 0;
  }

  wordRangeRead(address, words, callback) {
    if (callback == null && typeof items === 'function') {
      callback = items;
      words = undefined;
    }

    if (words == null) {
      words = 1;
    }

    return CallbackPromise(callback, resolver => {
      const transaction = incrementTransaction(this);
      const message = PCCCPacket.WordRangeReadRequest(transaction, address, words);

      this.send(message, null, false, this.contextCallback(function (error, reply) {
        if (error) {
          resolver.reject(error, reply);
        } else {
          resolver.resolve(reply.data);
        }
      }, transaction));
    });
  }

  typedRead(address, items, callback) {
    if (callback == null && typeof items === 'function') {
      callback = items;
      items = undefined;
    }

    return CallbackPromise(callback, resolver => {
      const itemsSpecified = items != null;

      if (itemsSpecified) {
        if ((!Number.isFinite(items) || items <= 0 || items > 0xFFFF)) {
          return resolver.reject('If specified, items must be a positive integer between 1 and 65535');
        }
      } else {
        items = 1;
      }

      const transaction = incrementTransaction(this);
      const message = PCCCPacket.TypedReadRequest(transaction, address, items);

      this.send(message, null, false, this.contextCallback(function (error, reply) {
        if (error) {
          resolver.reject(error, reply);
        } else {
          console.log(reply.data);
          const value = PCCCPacket.ParseTypedReadData(reply.data);
          if (items === 1 && Array.isArray(value) && value.length > 0) {
            resolver.resolve(value[0]);
          } else {
            resolver.resolve(value);
          }
        }
      }, transaction));
    });
  }

  /**
   * value argument can be an array of values
   */
  typedWrite(address, value, callback) {
    return CallbackPromise(callback, resolver => {
      if (value == null) {
        return resolver.reject(`Unable to write value: ${value}`);
      }

      if (!Array.isArray(value)) {
        value = [value];
      }

      const transaction = incrementTransaction(this);
      const message = PCCCPacket.TypedWriteRequest(transaction, address, value);

      this.send(message, null, false, this.contextCallback(function (error, reply) {
        if (error) {
          resolver.reject(error, reply);
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
  //   let transaction = incrementTransaction(this);
  //   let message = PCCCPacket.UnprotectedReadRequest(transaction, address, size);
  //
  //   this.send(message, null, false, this.contextCallback(function(error, reply) {
  //     if (error) {
  //       callback(error);
  //     } else {
  //       callback(null, reply);
  //     }
  //   }, transaction));
  // }

  diagnosticStatus(callback) {
    return CallbackPromise(callback, resolver => {
      const transaction = incrementTransaction(this);
      const message = PCCCPacket.DiagnosticStatusRequest(transaction);

      this.send(message, null, false, this.contextCallback(function (error, reply) {
        if (error) {
          resolver.reject(error, reply);
        } else {
          resolver.resolve(reply.data);
        }
      }, transaction));
    });
  }

  echo(data, callback) {
    return CallbackPromise(callback, resolver => {
      const transaction = incrementTransaction(this);
      const message = PCCCPacket.EchoRequest(transaction, data);
      this.send(message, null, false, this.contextCallback(function (error, reply) {
        if (error) {
          resolver.reject(error, reply);
        } else {
          resolver.resolve(reply.data);
        }
      }, transaction));
    });
  }

  
  /** For sending CIP requests over PCCC */
  sendNextMessage() {
    const request = this.getNextRequest();
    if (request != null) {
      // requests can either be
      // - unconnected (0x0B)
      // - connected (0x0A)

      // Fragmentation protocol is currently not supported

      let buffer = null;
      const transaction = incrementTransaction(this);

      const { info, message } = request;

      if (info != null && info.connectionID != null && info.transportHeader != null) {
        const data = Buffer.allocUnsafe(6 + message.length);
        data.writeUInt8(0, 0); // FNC
        data.writeUInt8(0, 1); // Extra
        data.writeUInt16LE(info.connectionID, 2);
        data.writeUInt16LE(info.transportHeader, 4);
        message.copy(data, 6);
        buffer = PCCCPacket.toBuffer(Commands.Connected, 0, transaction, data);
      } else {
        const data = Buffer.allocUnsafe(2 + message.length);
        data.writeUInt8(0, 0); // FNC
        data.writeUInt8(0, 1); // Extra
        message.copy(data, 2);
        buffer = PCCCPacket.toBuffer(Commands.Unconnected, 0, transaction, data);
      }

      this.send(buffer, null, false, this.layerContext(request.layer, transaction));

      setImmediate(() => this.sendNextMessage()); 
    }
  }


  handleData(data, info, context) {
    const packet = PCCCPacket.fromBufferReply(data);

    /** Handle response for request originating from PCCCLayer */
    const callback = this.callbackForContext(packet.transaction);
    if (callback != null) {
      callback(getError(packet.status), packet, info);
      return;
    }

    /** Handle response for requst originating from an upper layer (embedded CIP) */
    const layer = this.layerForContext(packet.transaction);
    if (layer != null) {
      this.forwardTo(layer, packet.data, info, context);
      return;
    }

    console.log('PCCCLayer Error: No callback or layer for context (transaction)');
    console.log(packet);
  }
}

module.exports = PCCCLayer;


function incrementTransaction(layer) {
  layer._transaction++;
  return layer._transaction % 0x10000;
}

function getError(status) {
  if (status.code === 0) return null;

  if (status.extended.description != null && status.extended.description.length > 0)
    return status.extended.description;

  return status.description;
}

const Commands = {
  Connected: 0x0A,
  Unconnected: 0x0B
};

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



// /** Ref. CIP and PCCC v1, Appendix B, pg. 17 */
// const FragmentationFunctions = {
//   Only: 0x00,
//   FirstRequest: 0x01,
//   Middle: 0x02,
//   Last: 0x03,
//   FirstResponse: 0x04,
//   SendMore: 0x05,
//   Abort: 0x06,
//   AckResponse: 0x07,
//   NakResponse: 0x08
// };


// class Fragger {
//   constructor(data, info) {
//     this.data = data;
//     this.info = info || {};
//     this.connected = this.info.connectionID && this.info.transportHeader;
//   }
// }