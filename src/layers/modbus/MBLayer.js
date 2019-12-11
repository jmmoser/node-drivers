'use strict';

const { CallbackPromise, once } = require('../../utils');
const Layer = require('../Layer');
const MB = require('./MB');
const MBFrame = require('./MBFrame');

const {
  ReadDiscreteInputs,
  ReadCoils,
  ReadInputRegisters,
  ReadHoldingRegisters,
  WriteSingleCoil,
  WriteMultipleCoils,
  WriteSingleRegister,
  // WriteMultipleRegisters
} = MB.Functions;

const DefaultOptions = {
  'tcp': {
    port: 502
  }
};

class MBLayer extends Layer {
  constructor(lowerLayer, options) {
    super('modbus', lowerLayer, null, DefaultOptions);

    switch (lowerLayer.name) {
      case 'tcp':
        const cOpts = Object.assign({
          unitID: 255,
          protocolID: 0
        }, options);
        this._transactionCounter = 0;
        this._frameClass = MBFrame.TCP;
        this._send = (fn, data, opts, resolver) => {
          opts = opts || {};
          this._transactionCounter = (this._transactionCounter + 1) % 0x10000;
          const unitID = opts.unitID || cOpts.unitID;
          const protocolID = opts.protocolID || cOpts.protocolID;
          const frame = new MBFrame.TCP(
            new MBFrame.PDU(fn, data),
            this._transactionCounter,
            unitID,
            protocolID
          );

          const callback = this.contextCallback(
            once(err => {
              if (err) {
                /** e.g. handle timeout error and return null*/
                resolver.reject(err);
                return null;
              } else {
                return resolver;
              }
            }),
            this._transactionCounter
          );

          this.send(frame.toBuffer(), null, false, callback);
        }
        this.setDefragger(MBFrame.TCP.IsComplete, MBFrame.TCP.Length);
        break;
      default:
        break;
    }
  }

  readDiscreteInputs(address, count, callback) {
    return readRequest(this, ReadDiscreteInputs, address, count, callback);
  }

  readCoils(address, count, callback) {
    return readRequest(this, ReadCoils, address, count, callback);
  }

  readInputRegisters(address, count, callback) {
    return readRequest(this, ReadInputRegisters, address, count, callback);
  }

  readHoldingRegisters(address, count, callback) {
    return readRequest(this, ReadHoldingRegisters, address, count, callback);
  }

  writeSingleCoil(address, value, callback) {
    return writeRequest(this, WriteSingleCoil, address, [value ? 0x00FF : 0x0000], callback);
  }

  writeMultipleCoils(address, values, callback) {
    for (let i = 0; i < values.length; i++) {
      values[i] = values[i] ? 0x00FF : 0x0000;
    }
    return writeRequest(this, WriteMultipleCoils, address, values, callback);
  }

  writeSingleRegister(address, values, callback) {
    return writeRequest(this, WriteSingleRegister, address, values, callback);
  }

  writeMultipleRegisters(address, values, callback) {
    return CallbackPromise(callback, resolver => {
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


function readRequest(self, fn, address, count, callback) {
  return CallbackPromise(callback, resolver => {
    const data = self._frameClass.ReadRequest(address, count);
    self._send(fn, data, {}, resolver);
    // send(self, fn, data, resolver);
  });
}

function writeRequest(self, fn, address, values, callback) {
  return CallbackPromise(callback, resolver => {
    const data = self._frameClass.WriteRequest(address, values);
    self._send(fn, data, {}, resolver);
    // send(self, fn, data, resolver);
  });
}


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

// function incrementTransactionCounter(self) {
//   self._transactionCounter = (self._transactionCounter + 1) % 0x10000;
//   return self._transactionCounter;
// }


function send(self, fn, data, resolver, timeout) {
  const frame = self._createFrame(fn, data, null);

  const callback = self.contextCallback(
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

  self.send(frame.toBuffer(), null, false, callback);
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