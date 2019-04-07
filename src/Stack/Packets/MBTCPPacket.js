'use strict';

const MBFunctions = {
  ReadCoils: 0x01,
  ReadDiscreteInputs: 0x02,
  ReadHoldingRegisters: 0x03,
  ReadInputRegisters: 0x04,
  WriteSingleCoil: 0x05,
  WriteSingleRegister: 0x06,
  ReadExceptionStatus: 0x07,
  WriteMultipleCoils: 0x0F,
  WriteMultipleRegisters: 0x10,
  ReportSlaveID: 0x11,
  MaskWriteRegister: 0x16,
  WriteAndReadRegisters: 0x17
};

// const MBExceptions = {
//   IllegalFunction: 0x01,
//   IllegalDataAddress: 0x02,
//   IllegalDataValue: 0x03,
//   SlaveOrServerFailure: 0x04,
//   Acknowledge: 0x05,
//   SlaveOrServerBusy: 0x06,
//   NegativeAcknowledge: 0x07,
//   MemoryParity: 0x08,
//   NotDefined: 0x09,
//   GatewayPath: 0x0A,
//   GatewayTarget: 0x0B,
//   Max: 0x0C
// };

const MBErrorDescriptions = {
  0x01: 'Illegal function',
  0x02: 'Illegal data address',
  0x03: 'Illegal data value',
  0x04: 'Slave or server failure',
  0x05: 'Acknowledge',
  0x06: 'Slave or server busy',
  0x07: 'Negative acknowledge',
  0x08: 'Memory parity',
  0x09: 'Not defined',
  0x0A: 'Gateway path',
  0x0B: 'Gateway target',
  0x0C: 'Max'
};


// class MBTCPADU {

// }

// function TCP_MBAPHeader(transactionID, protocolID, length, unitID) {
//   const buffer = Buffer.allocUnsafe(7);
//   buffer.writeUInt16BE(transactionID, 0);
//   buffer.writeUInt16BE(protocolID, 2);
//   buffer.writeUInt16BE(protocolID, 4);
//   buffer.writeUInt8(unitID, 6);
//   return buffer;
// }

const NullBuffer = Buffer.alloc(0);

class MBTCPPacket {
  constructor() {
    this.transactionID = 0;
    this.protocolID = 0;
    this.unitID = 0xFF;
    this.data = NullBuffer;
  }

  toBuffer() {
    const buffer = Buffer.alloc(7 + this.data.length);
    buffer.writeUInt16BE(this.transactionID, 0);
    buffer.writeUInt16BE(0, 2);
    buffer.writeUInt16BE(this.data.length + 1, 4);
    buffer.writeUInt8(this.unitID, 6);
    this.data.copy(buffer, 7);
    return buffer;
  }

  static FromBuffer(buffer) {
    const packet = new MBTCPPacket();
    packet.buffer = Buffer.from(buffer);
    packet.transactionID = buffer.readUInt16BE(0);
    packet.protocolID = buffer.readUInt16BE(2);
    packet.unitID = buffer.readUInt8(6);
    packet.data = buffer.slice(7, 6 + MBTCPPacket.DataLength(buffer));

    packet.reply = {};

    if (packet.data.length > 0) {
      const functionCode = packet.data.readUInt8(0);

      if (functionCode > 0x80) {
        const errorCode = packet.data.readUInt8(1);
        packet.reply.error = {
          code: errorCode,
          message: MBErrorDescriptions[errorCode] || 'Unknown error'
        };
      } else {
        packet.reply.functionCode = functionCode;
        if (ReplyFunctions[functionCode]) {
          packet.reply.data = ReplyFunctions[functionCode](packet.data, 0, packet.data.length);
        } else {
          packet.reply.data = packet.data.slice(1);
        }
      }
    }

    return packet;
  }

  static DataLength(buffer) {
    return buffer.readUInt16BE(4);
  }

  static Length(buffer) {
    return 6 + MBTCPPacket.DataLength(buffer);
  }

  static IsComplete(buffer, length) {
    if (length < 7) return false;
    return (length >= MBTCPPacket.Length(buffer));
  }
}

module.exports = MBTCPPacket;

MBTCPPacket.Functions = MBFunctions;

const ReplyFunctions = {};

ReplyFunctions[MBFunctions.ReadCoils] = function(buffer, offset, length) {
  const coils = [];
  const count = buffer.readUInt8(offset + 1);
  for (let i = 0; i < count; i++) {
    coils.push(buffer.readUInt8(offset + i + 2));
  }
  return coils;
};

ReplyFunctions[MBFunctions.ReadDiscreteInputs] = ReplyFunctions[MBFunctions.ReadCoils];

ReplyFunctions[MBFunctions.ReadHoldingRegisters] = function(buffer, offset, length) {
  const registers = [];
  const count = buffer.readUInt8(offset + 1) / 2;
  for (let i = 0; i < count; i++) {
    registers.push(buffer.readUInt16BE(offset + 2 * i + 2));
  }
  return registers;
};

ReplyFunctions[MBFunctions.ReadInputRegisters] = ReplyFunctions[MBFunctions.ReadHoldingRegisters];

ReplyFunctions[MBFunctions.WriteSingleRegister] = function(buffer, offset, length) {
  return buffer.slice(offset + 3, 5);
};

ReplyFunctions[MBFunctions.WriteMultipleRegisters] = function(buffer, offset, length) {
  return {
    count: buffer.readUInt16BE(offset + 3)
  };
};