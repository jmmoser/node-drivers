import {
  PCCCDataType,
  STSCodeDescriptions,
  EXTSTSCodeDescriptionsCMDF0,
} from './constants.js';

import {
  DecodeDataDescriptor,
  DecodeTypedData,
} from './decoding.js';

import {
  EncodeCommand,
  EncodeLogicalASCIIAddress,
  EncodeTypedData,
  EncodeDataDescriptor,
  DataTypeEncodingLength,
} from './encoding.js';

// Help from https://github.com/plcpeople/nodepccc/blob/00b4824972baec636deb0906454f841d8b832797/nodePCCC.js
function logicalASCIIAddressInfo(address) {
  const splitString = address.split(':');
  const prefix = splitString[0].replace(/[0-9]/gi, '');
  const info = {
    prefix,
    addrtype: prefix,
  };

  switch (prefix) {
    case 'S':
    case 'I':
    case 'N':
    case 'O':
    case 'B':
      info.datatype = 'INT';
      info.size = 2;
      info.id = PCCCDataType.Integer;
      break;
    case 'L': // Micrologix Only
      info.datatype = 'DINT';
      info.size = 4;
      break;
    case 'F':
      info.datatype = 'REAL';
      info.size = 4;
      info.id = PCCCDataType.Float;
      break;
    case 'T':
      info.datatype = 'TIMER';
      info.size = 6;
      break;
    case 'C':
      info.datatype = 'COUNTER';
      info.size = 6;
      break;
    case 'ST':
      info.datatype = 'STRING';
      info.size = 84;
      break;
    case 'NST': // N as string - special type to read strings moved into an integer array to support CompactLogix read-only.
      info.datatype = 'NSTRING';
      info.size = 44;
      break;
    case 'R':
      info.datatype = 'CONTROL';
      info.size = 6;
      break;
    case 'A': // TODO - support this.
    default:
      console.log(`Failed to find a match for ${splitString[0]} possibly because ${prefix} type is not supported yet.`);
      return undefined;
  }

  return info;
}

export default class PCCCPacket {
  constructor(command = 0, status = 0, transaction = 0, data) {
    this.command = command;
    this.transaction = transaction;
    this.data = data;

    this.status = {
      code: status,
      extended: {
        code: 0,
      },
    };
  }

  // this entire class method may not be needed
  // good for unit testing factory methods
  static fromBufferRequest(buffer, offsetRef) {
    const packet = new PCCCPacket();

    packet.service = buffer.readUInt8(offsetRef.current); offsetRef.current += 1;
    const pathSize = 2 * buffer.readUInt8(offsetRef.current); offsetRef.current += 1;
    packet.path = buffer.slice(offsetRef.current, offsetRef.current + pathSize);
    offsetRef.current += pathSize;
    const requestorIDLength = buffer.readUInt8(offsetRef.current); offsetRef.current += 1;
    packet.requestorID = buffer.slice(offsetRef.current, offsetRef.current + requestorIDLength);
    packet.vendorID = buffer.slice(offsetRef.current, offsetRef.current + 2);
    offsetRef.current += 2;
    packet.serialNumber = buffer.slice(offsetRef.current, offsetRef.current + 4);
    offsetRef.current += 4;

    if (requestorIDLength > 7) {
      packet.other = buffer.slice(offsetRef.current, offsetRef.current + requestorIDLength - 7);
      offsetRef.current += requestorIDLength - 7;
    }

    packet.command = buffer.readUInt8(offsetRef.current); offsetRef.current += 1;
    packet.status.code = buffer.readUInt8(offsetRef.current); offsetRef.current += 1;
    packet.transaction = buffer.readUInt16LE(offsetRef.current); offsetRef.current += 2;
    packet.data = buffer.slice(offsetRef.current);

    return packet;
  }

  static fromBufferReply(buffer, offsetRef) {
    const packet = new PCCCPacket();

    packet.command = buffer.readUInt8(offsetRef.current); offsetRef.current += 1;
    packet.status.code = buffer.readUInt8(offsetRef.current); offsetRef.current += 1;
    packet.status.description = STSCodeDescriptions[packet.status.code] || '';

    // if (buffer.length < 4) {
    //   return packet;
    // }

    packet.transaction = buffer.readUInt16LE(offsetRef.current); offsetRef.current += 2;

    if (packet.status.code === 0xF0) {
      packet.status.extended.code = buffer.readUInt8(offsetRef.current); offsetRef.current += 1;
      packet.status.extended.description = EXTSTSCodeDescriptionsCMDF0[packet.status.extended.code] || '';
    }

    packet.data = buffer.slice(offsetRef.current);
    offsetRef.current += packet.data.length;

    return packet;
  }

  encode() {
    return EncodeCommand(this.command, this.status.code, this.transaction, this.data);
  }

  static Encode(command, status, transaction, data) {
    return EncodeCommand(command, status, transaction, data);
  }

  static WordRangeReadRequest(transaction, address, words) {
    const info = logicalASCIIAddressInfo(address);
    if (!info) {
      throw new Error(`Unsupported address: ${address}`);
    }

    const offsetRef = { current: 0 };
    const data = Buffer.allocUnsafe(9 + address.length);
    offsetRef.current = data.writeUInt8(0x01, offsetRef.current); // Function

    /**
     * PACKET OFFSET
     * Contains the offset in words from the address in the in the address field.
     * For example, if the previous command read the maximum 244 bytes, the next
     * offset should be 122.
     */
    offsetRef.current = data.writeUInt16LE(0, offsetRef.current);

    /**
     * TOTAL TRANSACTION
     * Indicates the total amount of PLC-3 data table words (low byte first)
     * that are transferred for the entire transaction.
     */
    offsetRef.current = data.writeUInt16LE(words, offsetRef.current);

    /**
     * ADDRESS
     */
    EncodeLogicalASCIIAddress(data, offsetRef, address);

    /**
     * SIZE
     * Specifies how many bytes of PLC-3 data table information you read in this transaction.
     * The word range read command reads a maximum of 244 bytes per message packet.
     */
    const size = 2 * words;
    if (size > 244) {
      throw new Error(`Maximum size of a single word range read transaction is 244. Received: ${size}`);
    }

    offsetRef.current = data.writeUInt8(size, offsetRef.current);

    return new PCCCPacket(0x0F, 0, transaction, data);
  }

  static WordRangeReadReply(buffer) {
    // I believe there is a mistake in the DF1 manual,
    // The reply message should still contain a TNS
    return PCCCPacket.fromBufferReply(buffer, { current: 0 });
  }

  static TypedReadRequest(transaction, address, items) {
    // const info = logicalASCIIAddressInfo(address);
    // if (!info) {
    //   throw new Error(`Unsupported address: ${address}`);
    // }

    const offsetRef = { current: 0 };
    const data = Buffer.allocUnsafe(10 + address.length);
    offsetRef.current = data.writeUInt8(0x68, offsetRef.current); // function
    offsetRef.current = data.writeUInt16LE(0, offsetRef.current); /** Packet offset */
    // offset = data.writeUInt16LE((items * info.size / 2) + 1, offset); // Total Trans
    offsetRef.current = data.writeUInt16LE(items, offsetRef.current); // Total Trans
    EncodeLogicalASCIIAddress(data, offsetRef, address);
    offsetRef.current = data.writeUInt16LE(items, offsetRef.current); // Number of elements to read
    return new PCCCPacket(0x0F, 0, transaction, data);
  }

  static ParseTypedReadData(data, offset = 0) {
    const offsetRef = { current: offset };
    const descriptor = DecodeDataDescriptor(data, offsetRef);
    return DecodeTypedData(data, offsetRef, descriptor.type, descriptor.size);
  }

  static TypedWriteRequest(transaction, address, values) {
    const info = logicalASCIIAddressInfo(address);
    if (!info) {
      throw new Error(`Unsupported address: ${address}`);
    }

    const valueCount = values.length;
    const dataValueLength = valueCount * info.size;
    const dataTypeLength = DataTypeEncodingLength(info.id, info.size);
    const dataLength = 5 + (address.length + 3) + dataTypeLength + dataValueLength;

    const offsetRef = { current: 0 };
    const data = Buffer.allocUnsafe(dataLength);
    offsetRef.current = data.writeUInt8(0x67, offsetRef.current); /** function */
    offsetRef.current = data.writeUInt16LE(0, offsetRef.current); /** Packet offset */
    offsetRef.current = data.writeUInt16LE(valueCount, offsetRef.current); /** total transmitted */
    EncodeLogicalASCIIAddress(data, offsetRef, address);

    EncodeDataDescriptor(data, offsetRef, info.id, info.size);

    for (let i = 0; i < valueCount; i++) {
      EncodeTypedData(data, offsetRef, info.datatype, values[i]);
    }

    return new PCCCPacket(0x0F, 0, transaction, data);
  }

  static DiagnosticStatusRequest(transaction) {
    return new PCCCPacket(0x06, 0, transaction, Buffer.from([0x03]));
  }

  static EchoRequest(transaction, data) {
    if (!Buffer.isBuffer(data)) {
      data = Buffer.allocUnsafe(0);
    }
    const buffer = Buffer.allocUnsafe(data.length + 1);
    buffer.writeUInt8(0, 0);
    data.copy(buffer, 1);
    return new PCCCPacket(0x06, 0, transaction, buffer);
  }

  static UnprotectedRead(transaction, address, size) {
    const buffer = Buffer.allocUnsafe(3);
    buffer.writeUInt16LE(address, 0);
    buffer.writeUInt8(size, 2);
    return new PCCCPacket(0x01, 0, transaction, buffer);
  }

  /**
   * Supported Processors
   * - 1774-PLC
   * - PLC-2
   * - PLC-3
   * - PLC-5
   * - SLC 500
   * - MicroLogix 1000
  */
  static UnprotectedWrite(transaction, address, writeData) {
    const buffer = Buffer.allocUnsafe(2 + writeData.length);
    buffer.writeUInt16LE(address, 0);
    writeData.copy(buffer, 2);
    return new PCCCPacket(0x08, 0, transaction, buffer);
  }

  /**
   * Supported Processors
   * - PLC-5
   * - PLC-5/VME
   */
  static UploadAllRequest(transaction) {
    return new PCCCPacket(0x0F, 0, transaction, Buffer.from([0x53]));
  }

  /**
   * Supported Processors
   * - PLC-3
   */
  static Upload(transaction) {
    return new PCCCPacket(0x0F, 0, transaction, Buffer.from([0x06]));
  }

  // static UploadCompleted(transaction) {
  //   return new PCCCPacket(0x0F, 0, transaction, Buffer.from([0x55]));
  // }
}

// const PCCCDataTypes = {
//   1: 'bit',
//   2: 'bit string',
//   3: 'byte (or character string)',
//   4: 'integer',
//   5: 'Allen-Bradley timer',
//   6: 'Allen-Bradley counter',
//   7: 'Allen-Bradley general control structure',
//   8: 'IEEE floating point',
//   9: 'array of similar elements',
//   15: 'address data',
//   16: 'binary-coded decimal (BCD)'
// };

// const PCCCServiceCodes = {
//   0x4B: 'Exec PCCC Service',
//   0x4C: 'DH+ Like Service',
//   0x4D: 'Local PCCC Service'
// };

/*
  Source: http://iatip.blogspot.com/2008/11/ethernetip-pccc-service-codes.html
  To force a DF1 message with destination=5 and source=2
  0x4c                                              - DH+ Like Service
  0x02 0x20 0x67 0x24 0x01                          - IOI to PCCC object
  0x00 0x00 0x02 0x00 0x00 0x00 0x05 0x00           - DH+ Like Header
  0x0F 0x00 0x5C 0x00 0xA2 0x14 0x07 0x89 0x00 0x00 - example pccc message

  The originator info has been swapped with an 8 byte struct of the form
  AA AA BB XX CC CC DD XX.
  "XX" are control bytes of some sort, just leave 0x00
  "AA AA" is the destination link
  "BB" is the destination node
  "CC CC" is the source link
  "DD" is the source node
*/
