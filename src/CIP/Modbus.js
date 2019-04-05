'use strict';

const MessageRouter = require('./Objects/MessageRouter');
const Layer = require('./../Stack/Layers/Layer');

const MODBUS_EPATH = Buffer.from([0x20, 0x44, 0x24, 0x01]);


class Modbus extends Layer {
  readDiscreteInputs(address, count, callback) {
    // response - input values, array of octet, each input is packed as a bit within a byte
    return Layer.CallbackPromise(callback, resolver => {
      const buffer = Buffer.alloc(4);
      buffer.writeUInt16LE(address, 0); // offset in table to begin reading
      buffer.writeUInt16LE(count, 2); // number of inputs to read

      __send(this, Services.ReadDiscreteInputs, buffer, reply => {
        if (reply.status.code !== 0) {
          resolver.reject(`${BASE_ERROR}${reply.status.description}`, reply);
        } else {
          resolver.resolve(reply.data);
        }
      });
    });
  }

  readCoils(address, count, callback) {
    // response - coil status, array of octet, each coil is packed as a bit within a byte
    return Layer.CallbackPromise(callback, resolver => {
      const buffer = Buffer.alloc(4);
      buffer.writeUInt16LE(address, 0);
      buffer.writeUInt16LE(count, 2);

      __send(this, Services.ReadCoils, buffer, reply => {
        if (reply.status.code !== 0) {
          resolver.reject(`${BASE_ERROR}${reply.status.description}`, reply);
        } else {
          resolver.resolve(reply.data);
        }
      });
    });
  }

  readInputRegisters(address, count, callback) {
    // response - input register values, array of 16-bit words, input registers read
    return Layer.CallbackPromise(callback, resolver => {
      const buffer = Buffer.alloc(4);
      buffer.writeUInt16LE(address, 0);
      buffer.writeUInt16LE(count, 2);

      __send(this, Services.ReadInputRegisters, buffer, reply => {
        if (reply.status.code !== 0) {
          resolver.reject(`${BASE_ERROR}${reply.status.description}`, reply);
        } else {
          resolver.resolve(reply.data);
        }
      });
    });
  }

  readHoldingRegisters(address, count, callback) {
    return Layer.CallbackPromise(callback, resolver => {
      const buffer = Buffer.alloc(4);
      buffer.writeUInt16LE(address, 0);
      buffer.writeUInt16LE(count, 2);

      __send(this, Services.ReadHoldingRegisters, buffer, reply => {
        if (reply.status.code !== 0) {
          resolver.reject(`${BASE_ERROR}${reply.status.description}`, reply);
        } else {
          resolver.resolve(reply.data);
        }
      });
    });
  }

  writeCoils(address, values, callback) {
    // response - Starting Address, UINT, offset in table where writing began
    // response - Quantity of Outputs, UINT, number of outputs forced
    return Layer.CallbackPromise(callback, resolver => {
      const buffer = Buffer.alloc(4 + values.length);
      buffer.writeUInt16LE(address, 0);
      buffer.writeUInt16LE(count, 2);
      for (let i = 0; i < values.length; i++) {
        buffer.writeUInt8(values[i], 4 + i);
      }

      __send(this, Services.WriteCoils, buffer, reply => {
        if (reply.status.code !== 0) {
          resolver.reject(`${BASE_ERROR}${reply.status.description}`, reply);
        } else {
          resolver.resolve(reply.data);
        }
      });
    });
  }

  writeHoldingRegisters(address, values, callback) {
    // response - Starting Address, UINT, offset in table where writing began
    // response - Quantity of Outputs, UINT, number of outputs forced
    return Layer.CallbackPromise(callback, resolver => {
      const buffer = Buffer.alloc(4 + 2 * values.length);
      buffer.writeUInt16LE(address, 0);
      buffer.writeUInt16LE(values.length, 2);
      for (let i = 0; i < values.length; i++) {
        buffer.writeUInt16LE(values[i]);
      }

      __send(this, Services.WriteHoldingRegisters, buffer, reply => {
        if (reply.status.code !== 0) {
          resolver.reject(`${BASE_ERROR}${reply.status.description}`, reply);
        } else {
          resolver.resolve(reply.data);
        }
      });
    });
  }

  passthrough(functionCode, data, callback) {
    // response - function code or exception code, USINT, function code of the modbus response
    // response - data response, array of octet, parameter data for the modbus function response, this may include sub-function codes
    return Layer.CallbackPromise(callback, resolver => {
      const buffer = Buffer.concat([Buffer.from([functionCode]), data]);

      __send(this, Services.Passthrough, buffer, reply => {
        if (reply.status.code !== 0) {
          resolver.reject(`${BASE_ERROR}${reply.status.description}`, reply);
        } else {
          resolver.resolve(reply.data);
        }
      });
    });
  }
}

module.exports = Modbus;

Modbus.Code = 0x44;

function __send(driver, service, data, callback) {
  const request = MessageRouter.Request(service, MODBUS_EPATH, data);
  driver.send(request, null, false, this.contextCallback(function(message) {
    callback(MessageRouter.Reply(message));
  }));
}

const Services = {
  ReadDiscreteInputs: 0x4B,
  ReadCoils: 0x4C,
  ReadInputRegisters: 0x4D,
  ReadHoldingRegisters: 0x4E,
  WriteCoils: 0x4F,
  WriteHoldingRegisters: 0x50,
  Passthrough: 0x51
};
