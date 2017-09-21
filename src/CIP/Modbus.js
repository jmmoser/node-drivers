'use strict';

const MessageRouter = require('./Objects/MessageRouter');

const modbusPath = Buffer.from([0x20, 0x67, 0x24, 0x01]);

const Layer = require('./../Stack/Layers/Layer');

class Modbus extends Layer {
  ReadDiscreteInputs(address, count) {
    let buffer = Buffer.alloc(4);
    buffer.writeUInt16LE(address, 0); // offset in table to begin reading
    buffer.writeUInt16LE(count, 2); // number of inputs to read
    let request = MessageRouter.Request(Services.ReadDiscreteInputs, modbusPath, buffer);
    // response - input values, array of octet, each input is packed as a bit within a byte
  }

  ReadCoils(address, count) {
    let buffer = Buffer.alloc(4);
    buffer.writeUInt16LE(address, 0);
    buffer.writeUInt16LE(address, 2);
    let request = MessageRouter.Request(Services.ReadCoils, modbusPath, buffer);
    // response - coil status, array of octet, each coil is packed as a bit within a byte
  }

  ReadInputRegisters(address, count) {
    let buffer = Buffer.alloc(4);
    buffer.writeUInt16LE(address, 0);
    buffer.writeUInt16LE(count, 2);
    let request = MessageRouter.Request(Services.ReadInputRegisters, modbusPath, buffer);
    // response - input register values, array of 16-bit word, input registers read
  }

  ReadHoldingRegisters(address, count) {
    let buffer = Buffer.alloc(4);
    buffer.writeUInt16LE(address, 0);
    buffer.writeUInt16LE(count, 2);
    let request = MessageRouter.Request(Services.ReadHoldingRegisters, modbusPath, buffer);
    // response - holding register values, array of 16-bit word, holding register values read
  }

  WriteCoils(address, values) {
    let buffer = Buffer.alloc(4 + values.length);
    buffer.writeUInt16LE(address, 0);
    buffer.writeUInt16LE(count, 2);
    for (let i = 0; i < values.length; i++) {
      buffer.writeUInt8(values[i], 4 + i);
    }
    let request = MessageRouter.Request(Services.WriteCoils, modbusPath, buffer);
    // response - Starting Address, UINT, offset in table where writing began
    // response - Quantity of Outputs, UINT, number of outputs forced
  }

  WriteHoldingRegisters(address, values) {
    let buffer = Buffer.alloc(4 + 2 * values.length);
    buffer.writeUInt16LE(address, 0);
    buffer.writeUInt16LE(values.length, 2);
    for (let i = 0; i < values.length; i++) {
      buffer.writeUInt16LE(values[i]);
    }
    let request = MessageRouter.Request(Services.WriteHoldingRegisters, modbusPath, buffer);
    // response - Starting Address, UINT, offset in table where writing began
    // response - Quantity of Outputs, UINT, number of outputs forced
  }

  Passthrough(functionCode, data) {
    let buffer = Buffer.concat(Buffer.from([functionCode], data));
    let request = MessageRouter.Request(Services.Passthrough, modbusPath, buffer);
    // response - function code or exception code, USINT, function code of the modbus response
    // response - data response, array of octet, parameter data for the modbus function response, this may include sub-function codes
  }
}

module.exports = Modbus;

Modbus.Code = 0x44;

const Services = {
  ReadDiscreteInputs: 0x4B,
  ReadCoils: 0x4C,
  ReadInputRegisters: 0x4D,
  ReadHoldingRegisters: 0x4E,
  WriteCoils: 0x4F,
  WriteHoldingRegisters: 0x50,
  Passthrough: 0x51
};
