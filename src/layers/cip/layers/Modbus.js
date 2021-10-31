// 

// // import Layer from '../../Layer';
// import CIPLayer from '../layers/internal/CIPLayer';
// import { ClassCodes } from '../core/constants';
// import EPath from '../core/epath';
// import CIPRequest from '../core/request';
// import { CallbackPromise } from '../../../utils';

// class Modbus extends CIPLayer {
//   constructor(lowerLayer) {
//     // super('modbus.cip', lowerLayer);
//     super(lowerLayer, null, 'modbus.cip');
//   }

//   readDiscreteInputs(address, count, callback) {
//     /** response - input values, array of octet, each input is packed as a bit within a byte */
//     return CallbackPromise(callback, resolver => {
//       send(this, Services.ReadDiscreteInputs, createData(address, count), (error, reply) => {
//         if (error) {
//           resolver.reject(error, reply);
//         } else {
//           resolver.resolve(reply.data);
//         }
//       });
//     });
//   }

//   readCoils(address, count, callback) {
//     /** response - coil status, array of octet, each coil is packed as a bit within a byte */
//     return CallbackPromise(callback, resolver => {
//       send(this, Services.ReadCoils, createData(address, count), (error, reply) => {
//         if (error) {
//           resolver.reject(error, reply);
//         } else {
//           resolver.resolve(reply.data);
//         }
//       });
//     });
//   }

//   readInputRegisters(address, count, callback) {
//     /** response - input register values, array of 16-bit words, input registers read */
//     return CallbackPromise(callback, resolver => {
//       send(this, Services.ReadInputRegisters, createData(address, count), (error, reply) => {
//         if (error) {
//           resolver.reject(error, reply);
//         } else {
//           resolver.resolve(reply.data);
//         }
//       });
//     });
//   }

//   readHoldingRegisters(address, count, callback) {
//     return CallbackPromise(callback, resolver => {
//       send(this, Services.ReadHoldingRegisters, createData(address, count), (error, reply) => {
//         if (error) {
//           resolver.reject(error, reply);
//         } else {
//           resolver.resolve(reply.data);
//         }
//       });
//     });
//   }

//   writeCoils(address, values, callback) {
//     // response - Starting Address, UINT, offset in table where writing began
//     // response - Quantity of Outputs, UINT, number of outputs forced
//     return CallbackPromise(callback, resolver => {
//       const buffer = Buffer.alloc(4 + values.length);
//       buffer.writeUInt16LE(address, 0);
//       buffer.writeUInt16LE(values.length, 2);
//       for (let i = 0; i < values.length; i++) {
//         buffer.writeUInt8(values[i], 4 + i);
//       }

//       send(this, Services.WriteCoils, buffer, (error, reply) => {
//         if (error) {
//           resolver.reject(error, reply);
//         } else {
//           resolver.resolve(reply.data);
//         }
//       });
//     });
//   }

//   writeHoldingRegisters(address, values, callback) {
//     // response - Starting Address, UINT, offset in table where writing began
//     // response - Quantity of Outputs, UINT, number of outputs forced
//     return CallbackPromise(callback, resolver => {
//       const buffer = Buffer.alloc(4 + 2 * values.length);
//       buffer.writeUInt16LE(address, 0);
//       buffer.writeUInt16LE(values.length, 2);
//       for (let i = 0; i < values.length; i++) {
//         buffer.writeUInt16LE(values[i]);
//       }

//       send(this, Services.WriteHoldingRegisters, buffer, (error, reply) => {
//         if (error) {
//           resolver.reject(error, reply);
//         } else {
//           resolver.resolve(reply.data);
//         }
//       });
//     });
//   }

//   passthrough(functionCode, data, callback) {
//     // response - function code or exception code, USINT, function code of the modbus response
//     // response - data response, array of octet, parameter data for the modbus function response, this may include sub-function codes
//     return CallbackPromise(callback, resolver => {
//       const buffer = Buffer.concat([Buffer.from([functionCode]), data]);

//       send(this, Services.Passthrough, buffer, (error, reply) => {
//         if (error) {
//           resolver.reject(error, reply);
//         } else {
//           resolver.resolve(reply.data);
//         }
//       });
//     });
//   }
// }

// module.exports = Modbus;

// const MODBUS_EPATH = EPath.Encode(true, [
//   new EPath.Segments.Logical.ClassID(ClassCodes.Modbus),
//   new EPath.Segments.Logical.InstanceID(0x01)
// ]);

// function createData(address, count) {
//   const buffer = Buffer.allocUnsafe(4);
//   buffer.writeUInt16LE(address, 0);
//   buffer.writeUInt16LE(count, 2);
//   return buffer;
// }

// /** Use driver specific error handling if exists */
// function send(self, service, data, callback) {
//   self.sendRequest(false, new CIPRequest(service, MODBUS_EPATH, data), this.contextCallback(callback));
// }

// const Services = Object.freeze({
//   ReadDiscreteInputs: 0x4B,
//   ReadCoils: 0x4C,
//   ReadInputRegisters: 0x4D,
//   ReadHoldingRegisters: 0x4E,
//   WriteCoils: 0x4F,
//   WriteHoldingRegisters: 0x50,
//   Passthrough: 0x51
// });

// // 

// // const { ClassCodes } from '../../core/constants');
// // const EPath from '../../core/epath');
// // const CIPLayer from './CIPLayer');
// // const CIPRequest from '../../core/request');
// // const { CallbackPromise } from '../../../../utils');

// // class Modbus extends CIPLayer {
// //   constructor(lowerLayer) {
// //     super('modbus.cip', lowerLayer);
// //   }

// //   readDiscreteInputs(address, count, callback) {
// //     /** response - input values, array of octet, each input is packed as a bit within a byte */
// //     return CallbackPromise(callback, resolver => {
// //       send(this, Services.ReadDiscreteInputs, createData(address, count), (error, reply) => {
// //         if (error) {
// //           resolver.reject(error, reply);
// //         } else {
// //           resolver.resolve(reply.data);
// //         }
// //       });
// //     });
// //   }

// //   readCoils(address, count, callback) {
// //     /** response - coil status, array of octet, each coil is packed as a bit within a byte */
// //     return CallbackPromise(callback, resolver => {
// //       send(this, Services.ReadCoils, createData(address, count), (error, reply) => {
// //         if (error) {
// //           resolver.reject(error, reply);
// //         } else {
// //           resolver.resolve(reply.data);
// //         }
// //       });
// //     });
// //   }

// //   readInputRegisters(address, count, callback) {
// //     /** response - input register values, array of 16-bit words, input registers read */
// //     return CallbackPromise(callback, resolver => {
// //       send(this, Services.ReadInputRegisters, createData(address, count), (error, reply) => {
// //         if (error) {
// //           resolver.reject(error, reply);
// //         } else {
// //           resolver.resolve(reply.data);
// //         }
// //       });
// //     });
// //   }

// //   readHoldingRegisters(address, count, callback) {
// //     return CallbackPromise(callback, resolver => {
// //       send(this, Services.ReadHoldingRegisters, createData(address, count), (error, reply) => {
// //         if (error) {
// //           resolver.reject(error, reply);
// //         } else {
// //           resolver.resolve(reply.data);
// //         }
// //       });
// //     });
// //   }

// //   writeCoils(address, values, callback) {
// //     // response - Starting Address, UINT, offset in table where writing began
// //     // response - Quantity of Outputs, UINT, number of outputs forced
// //     return CallbackPromise(callback, resolver => {
// //       const buffer = Buffer.alloc(4 + values.length);
// //       buffer.writeUInt16LE(address, 0);
// //       buffer.writeUInt16LE(values.length, 2);
// //       for (let i = 0; i < values.length; i++) {
// //         buffer.writeUInt8(values[i], 4 + i);
// //       }

// //       send(this, Services.WriteCoils, buffer, (error, reply) => {
// //         if (error) {
// //           resolver.reject(error, reply);
// //         } else {
// //           resolver.resolve(reply.data);
// //         }
// //       });
// //     });
// //   }

// //   writeHoldingRegisters(address, values, callback) {
// //     // response - Starting Address, UINT, offset in table where writing began
// //     // response - Quantity of Outputs, UINT, number of outputs forced
// //     return CallbackPromise(callback, resolver => {
// //       const buffer = Buffer.alloc(4 + 2 * values.length);
// //       buffer.writeUInt16LE(address, 0);
// //       buffer.writeUInt16LE(values.length, 2);
// //       for (let i = 0; i < values.length; i++) {
// //         buffer.writeUInt16LE(values[i]);
// //       }

// //       send(this, Services.WriteHoldingRegisters, buffer, (error, reply) => {
// //         if (error) {
// //           resolver.reject(error, reply);
// //         } else {
// //           resolver.resolve(reply.data);
// //         }
// //       });
// //     });
// //   }

// //   passthrough(functionCode, data, callback) {
// //     // response - function code or exception code, USINT, function code of the modbus response
// //     // response - data response, array of octet, parameter data for the modbus function response, this may include sub-function codes
// //     return CallbackPromise(callback, resolver => {
// //       const buffer = Buffer.concat([Buffer.from([functionCode]), data]);

// //       send(this, Services.Passthrough, buffer, (error, reply) => {
// //         if (error) {
// //           resolver.reject(error, reply);
// //         } else {
// //           resolver.resolve(reply.data);
// //         }
// //       });
// //     });
// //   }
// // }

// // module.exports = Modbus;


// // const MODBUS_EPATH = EPath.Encode(true, [
// //   new EPath.Segments.Logical.ClassID(ClassCodes.Modbus),
// //   new EPath.Segments.Logical.InstanceID(0x01)
// // ]);

// // function createData(address, count) {
// //   const buffer = Buffer.allocUnsafe(4);
// //   buffer.writeUInt16LE(address, 0);
// //   buffer.writeUInt16LE(count, 2);
// //   return buffer;
// // }

// // /** Use driver specific error handling if exists */
// // function send(self, service, data, callback) {
// //   self.sendRequest(false, new CIPRequest(service, MODBUS_EPATH, data), this.contextCallback(callback));
// // }

// // const Services = Object.freeze({
// //   ReadDiscreteInputs: 0x4B,
// //   ReadCoils: 0x4C,
// //   ReadInputRegisters: 0x4D,
// //   ReadHoldingRegisters: 0x4E,
// //   WriteCoils: 0x4F,
// //   WriteHoldingRegisters: 0x50,
// //   Passthrough: 0x51
// // });
