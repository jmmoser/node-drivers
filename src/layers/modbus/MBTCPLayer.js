// 'use strict';

// const { CallbackPromise } = require('../../utils');
// const Layer = require('../Layer');
// const MBTCPPacket = require('./MBTCPPacket');

// const {
//   ReadDiscreteInputs,
//   ReadCoils,
//   ReadInputRegisters,
//   ReadHoldingRegisters,
//   WriteSingleCoil,
//   WriteMultipleCoils,
//   WriteSingleRegister,
//   WriteMultipleRegisters
// } = MBTCPPacket.Functions;

// class MBTCPLayer extends Layer {
//   constructor(layer) {
//     super('modbus.tcp', layer);
    
//     this._transactionCounter = 0;

//     this.setDefragger(MBTCPPacket.IsComplete, MBTCPPacket.Length);
//   }

//   readDiscreteInputs(unitID, address, count, callback) {
//     return CallbackPromise(callback, resolver => {
//       const data = readRequest(ReadDiscreteInputs, address, count);
//       send(this, unitID, data, resolver);
//     });
//   }

//   readCoils(unitID, address, count, callback) {
//     return CallbackPromise(callback, resolver => {
//       const data = readRequest(ReadCoils, address, count);
//       send(this, unitID, data, resolver);
//     });
//   }

//   readInputRegisters(unitID, address, count, callback) {
//     return CallbackPromise(callback, resolver => {
//       const data = readRequest(ReadInputRegisters, address, count);
//       send(this, unitID, data, resolver);
//     });
//   }

//   readHoldingRegisters(unitID, address, count, callback) {
//     return CallbackPromise(callback, resolver => {
//       const data = readRequest(ReadHoldingRegisters, address, count);
//       send(this, unitID, data, resolver);
//     });
//   }

//   writeSingleCoil(unitID, address, value, callback) {
//     return CallbackPromise(callback, resolver => {
//       const data = writeRequest(WriteSingleCoil, address, [value ? 0x00FF : 0x0000]);
//       send(this, unitID, data, resolver);
//     });
//   }

//   writeMultipleCoils(unitID, address, values, callback) {
//     return CallbackPromise(callback, resolver => {
//       for (let i = 0; i < values.length; i++) {
//         values[i] = values[i] ? 0x00FF : 0x0000;
//       }
//       const data = writeRequest(WriteMultipleCoils, address, values);
//       send(this, unitID, data, resolver);
//     });
//   }

//   writeSingleRegister(unitID, address, value, callback) {
//     return CallbackPromise(callback, resolver => {
//       const data = writeRequest(WriteSingleRegister, address, [value]);
//       send(this, unitID, data, resolver);
//     });
//   }

//   writeMultipleRegisters(unitID, address, values, callback) {
//     return CallbackPromise(callback, resolver => {
//       // const fn = Functions.WriteMultipleRegisters;
//       resolver.reject('Not supported yet');
//     });
//   }


//   handleData(data) {
//     const packet = MBTCPPacket.FromBuffer(data);
    
//     // const resolver = this.callbackForContext(packet.transactionID);
//     const callback = this.callbackForContext(packet.transactionID);
//     const resolver = callback ? callback() : null;

//     if (resolver) {
//       const reply = packet.reply;
//       if (reply.error) {
//         resolver.reject(reply.error.message, reply);
//       } else {
//         resolver.resolve(reply.data);
//       }
//     } else {
//       console.log('Unhandled ModbusTCP packet:');
//       console.log(packet);
//       console.log(arguments);
//     }
//   }


//   // handleData(data) {
//   //   const packet = MBTCPPacket.FromBuffer(data);

//   //   if (this._callbacks.has(packet.transactionID)) {
//   //     const resolver = this._callbacks.get(packet.transactionID);
//   //     this._callbacks.delete(packet.transactionID);

//   //     const reply = packet.reply;
//   //     if (reply.error) {
//   //       resolver.reject(reply.error.message, reply);
//   //     } else {
//   //       resolver.resolve(reply.data);
//   //     }
//   //   } else {
//   //     console.log('Unhandled ModbusTCP packet:');
//   //     console.log(packet);
//   //   }
//   // }


//   // handleDestroy(error) {
//   //   this._callbacks.forEach(function(resolver) {
//   //     resolver.reject(error);
//   //   });
//   //   this._callbacks.clear();
//   // }
// }

// module.exports = MBTCPLayer;


// function readRequest(functionCode, startingAddress, count) {
//   const buffer = Buffer.allocUnsafe(5);
//   buffer.writeUInt8(functionCode, 0);
//   buffer.writeUInt16BE(startingAddress, 1);
//   buffer.writeUInt16BE(count, 3);
//   return buffer;
// }

// function writeRequest(functionCode, startingAddress, values) {
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

// function send(self, unitID, data, resolver) {
//   const transactionID = incrementTransactionCounter(self);

//   const packet = new MBTCPPacket();
//   packet.transactionID = transactionID;
//   packet.unitID = unitID;
//   packet.data = data;

//   const callback = resolver == null ? null : () => resolver;

//   self.send(packet.toBuffer(), null, false, callback != null ? self.contextCallback(callback, transactionID) : null);
// }