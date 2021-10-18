'use strict';

const { Functions, FunctionNames, ErrorDescriptions } = require('../constants');
const PDU = require('../pdu');

class TCP {
  constructor(pdu, transactionID, protocolID = 0, buffer, reply) {
    this.transactionID = transactionID;
    this.protocolID = protocolID;
    this.pdu = pdu;

    if (buffer) {
      this._buffer = buffer;
    }

    if (reply) {
      this.reply = reply;
    }
  }

  static ReadRequest(startingAddress, count) {
    const buffer = Buffer.allocUnsafe(4);
    buffer.writeUInt16BE(startingAddress, 0);
    buffer.writeUInt16BE(count, 2);
    return buffer;
  }

  static WriteRequest(startingAddress, values) {
    let buffer;
    if (Buffer.isBuffer(values)) {
      buffer = Buffer.alloc(2 + values.length);
      buffer.writeUInt16BE(startingAddress, 0);
      values.copy(buffer, 2);
    } else if (Array.isArray(values)) {
      buffer = Buffer.alloc(2 + 2 * values.length);
      buffer.writeUInt16BE(startingAddress, 0);
      for (let i = 0; i < values.length; i++) {
        const value = values[i];
        const offset = 2 * i + 2;
        if (Buffer.isBuffer(value) && value.length === 2) {
          value.copy(buffer, offset, 0, 2);
        } else if (Number.isFinite(value)) {
          buffer.writeInt16BE(value, offset);
        } else {
          throw new Error('Modbus TCP write request error: currently supports buffer, array of 2-byte buffers, or array of finite numbers');
        }
      }
    } else {
      throw new Error('Modbus TCP write request error: currently supports buffer, array of 2-byte buffers, or array of finite numbers');
    }

    return buffer;
  }

  static RemainingLength(buffer, offset = 0) {
    return buffer.readUInt16BE(offset + 4);
  }

  static Length(buffer, offset = 0) {
    return 6 + TCP.RemainingLength(buffer, offset);
  }

  static IsComplete(buffer, length, offset = 0) {
    if (length < 7) return false;
    return (length >= TCP.Length(buffer, offset));
  }

  static FromBuffer(buffer, offset = 0) {
    // if (!TCP.IsComplete(buffer, buffer.length - offset, offset)) {
    //   return null;
    // }

    const transactionID = buffer.readUInt16BE(offset);
    const protocolID = buffer.readUInt16BE(offset + 2);
    /** skip unit ID (offset + 6), assume it is 0xFF */
    const fn = buffer.readUInt8(offset + 7);
    const data = buffer.slice(offset + 8, offset + TCP.RemainingLength(buffer, offset) + 6);

    const reply = {};

    if (fn > 0x80) {
      const errorCode = data.readUInt8(0);
      reply.error = {
        code: errorCode,
        message: ErrorDescriptions[errorCode] || 'Unknown error',
      };
    } else {
      reply.fn = {
        code: fn,
        name: FunctionNames[fn] || 'Unknown',
      };

      reply.data = TCP.ParseReplyData(fn, data, 0);
    }

    return new TCP(new PDU(fn, data), transactionID, protocolID, buffer, reply);
  }

  toBuffer() {
    const { fn, data } = this.pdu;

    const buffer = Buffer.alloc(8 + data.length);
    buffer.writeUInt16BE(this.transactionID, 0);
    buffer.writeUInt16BE(this.protocolID, 2);
    buffer.writeUInt16BE(data.length + 2, 4);
    buffer.writeUInt8(0xFF, 6); // Always use 0xFF for unit ID over TCP
    buffer.writeUInt8(fn, 7);
    data.copy(buffer, 8);
    return buffer;
  }

  static ParseReplyData(fn, buffer, offset) {
    switch (fn) {
      case Functions.ReadCoils:
      case Functions.ReadDiscreteInputs: {
        const values = [];
        const count = buffer.readUInt8(offset);
        for (let i = 0; i < count; i++) {
          values.push(buffer.readUInt8(offset + i + 1));
        }
        return values;
      }
      case Functions.ReadHoldingRegisters:
      case Functions.ReadInputRegisters: {
        const values = [];
        const count = buffer.readUInt8(offset) / 2;
        for (let i = 0; i < count; i++) {
          values.push(buffer.readUInt16BE(offset + 2 * i + 1));
        }
        return values;
      }
      case Functions.WriteSingleHoldingRegister: {
        return buffer.slice(offset + 2, offset + 4);
      }
      case Functions.WriteMultipleHoldingRegisters: {
        return buffer.readUInt16BE(offset + 2);
      }
      default:
        return undefined;
    }
  }
}

module.exports = TCP;
