'use strict';

const { once } = require('../../utils');
const Layer = require('../Layer');
const MBFrame = require('./MBFrame');

/**
 * TODO:
 * - abstract away transaction
 *    - only ModbusTCP uses transaction
 *
 */

const {
  ReadDiscreteInputs,
  ReadCoils,
  ReadInputRegisters,
  ReadHoldingRegisters,
  WriteSingleCoil,
  WriteMultipleCoils,
  WriteSingleRegister,
  // WriteMultipleRegisters
} = MBTCPPacket.Functions;

class MBLayer extends Layer {
  constructor(lowerLayer, options) {
    super('Modbus', lowerLayer);

    this.options = options || {};

    this._transactionCounter = 0;
    

    // this.setDefragger(MBTCPPacket.IsComplete, MBTCPPacket.Length);
    switch (lowerLayer.name) {
      case 'TCP':
        this._frameClass = MBFrame.TCP;
        this.setDefragger(MBFrame.TCP.IsComplete, MBFrame.TCP.Length);
        break;
      default:
        break;
    }
  }

  readDiscreteInputs(address, count, callback) {
    return Layer.CallbackPromise(callback, resolver => {
      const data = this._frameClass.ReadRequest(address, count);
      send(this, ReadDiscreteInputs, data, resolver);
    });
  }

  readCoils(address, count, callback) {
    return Layer.CallbackPromise(callback, resolver => {
      const data = this._frameClass.ReadRequest(address, count);
      send(this, ReadCoils, data, resolver);
    });
  }

  readInputRegisters(address, count, callback) {
    return Layer.CallbackPromise(callback, resolver => {
      const data = this._frameClass.ReadRequest(address, count);
      send(this, ReadInputRegisters, data, resolver);
    });
  }

  readHoldingRegisters(address, count, callback) {
    return Layer.CallbackPromise(callback, resolver => {
      const data = this._frameClass.ReadRequest(address, count);
      send(this, ReadHoldingRegisters, data, resolver);
    });
  }

  writeSingleCoil(address, value, callback) {
    return Layer.CallbackPromise(callback, resolver => {
      const data = writeRequest(WriteSingleCoil, address, [value ? 0x00FF : 0x0000]);
      send(this, WriteSingleCoil, data, resolver);
    });
  }

  writeMultipleCoils(address, values, callback) {
    return Layer.CallbackPromise(callback, resolver => {
      for (let i = 0; i < values.length; i++) {
        values[i] = values[i] ? 0x00FF : 0x0000;
      }
      const data = this._frameClass.WriteRequest(address, values);
      send(this, WriteMultipleCoils, data, resolver);
    });
  }

  writeSingleRegister(address, values, callback) {
    return Layer.CallbackPromise(callback, resolver => {
      const data = this._frameClass.WriteRequest(address, values);
      send(this, WriteSingleRegister, data, resolver);
    });
  }

  writeMultipleRegisters(address, values, callback) {
    return Layer.CallbackPromise(callback, resolver => {
      // const fn = Functions.WriteMultipleRegisters;
      resolver.reject('Not supported yet');
    });
  }

  handleData(data) {
    const packet = this._frameClass.FromBuffer(data);

    const callback = this.callbackForContext(packet.transactionID);
    if (callback) {
      /**
       * We were expecting this message but it may have already timed out.
       * If it has timed out, callback will return null
       **/
      const resolver = callback();

      if (resolver) {
        const reply = packet.reply;
        if (reply.error) {
          resolver.reject(reply.error.message, reply);
        } else {
          resolver.resolve(reply.data);
        }
      }
      else {
        console.log(`Timed out message received`);
        console.log(packet);
      }
    } else {
      console.log('Unhandled Modbus packet:');
      console.log(packet);
      console.log(arguments);
    }

    // const resolver = callback ? callback() : null;

    // if (resolver) {
    //   const reply = packet.reply;
    //   if (reply.error) {
    //     resolver.reject(reply.error.message, reply);
    //   } else {
    //     resolver.resolve(reply.data);
    //   }
    // } else {
    //   console.log('Unhandled ModbusTCP packet:');
    //   console.log(packet);
    //   console.log(arguments);
    // }
  }
}

module.exports = MBLayer;


// function readRequest(startingAddress, count) {
//   const buffer = Buffer.allocUnsafe(4);
//   buffer.writeUInt16BE(startingAddress, 0);
//   buffer.writeUInt16BE(count, 2);
//   return buffer;
// }

// function writeRequest(startingAddress, values) {
//   const buffer = Buffer.alloc(3 + 2 * values.length);
//   buffer.writeUInt8(functionCode, 0);
//   buffer.writeUInt16BE(startingAddress, 1);
//   for (let i = 0; i < values.length; i++) {
//     values[i].copy(buffer, 2 * i + 3, 0, 2);
//   }
//   return buffer;
// }

function incrementTransactionCounter(self) {
  self._transactionCounter = (self._transactionCounter + 1) % 0x10000;
  return self._transactionCounter;
}


function send(self, fn, data, resolver, timeout) {
  const transactionID = incrementTransactionCounter(self);

  // const packet = new MBFrame.TCP()
  const packet = new MBTCPPacket();
  packet.transactionID = transactionID;
  packet.unitID = unitID;
  packet.data = data;

  const callback = resolver == null ? null : self.contextCallback(
    once(err => {
      if (err) {
        /** e.g. handle timeout error and return null*/
        resolver.reject(err);
        return null;
      } else {
        return resolver;
      }
    }),
    transactionID,
    timeout
  );

  self.send(packet.toBuffer(), null, false, callback);
}

// function send(self, unitID, data, resolver, timeout) {
//   const transactionID = incrementTransactionCounter(self);

//   const packet = new MBTCPPacket();
//   packet.transactionID = transactionID;
//   packet.unitID = unitID;
//   packet.data = data;

//   const callback = resolver == null ? null : self.contextCallback(
//     once(err => {
//       if (err) {
//         /** e.g. handle timeout error and return null*/
//         resolver.reject(err);
//         return null;
//       } else {
//         return resolver;
//       }
//     }),
//     transactionID,
//     timeout
//   );

//   self.send(packet.toBuffer(), null, false, callback);
// }