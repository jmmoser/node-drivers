'use strict';

const {
  getBits,
  encodeUnsignedInteger,
  unsignedIntegerSize,
} = require('../../utils');

const {
  PCCCDataType,
  STSCodeDescriptions,
  EXTSTSCodeDescriptionsCMDF0,
} = require('./constants');

function encode(command, status, transaction, data = []) {
  const buffer = Buffer.allocUnsafe(4 + data.length);
  buffer.writeUInt8(command, 0);
  buffer.writeUInt8(status, 1);
  buffer.writeUInt16LE(transaction, 2);
  if (data.length > 0) {
    data.copy(buffer, 4);
  }
  return buffer;
}

function encodeLogicalASCIIAddress(address, buffer, offset = 0) {
  offset = buffer.writeUInt8(0x00, offset);
  offset = buffer.writeUInt8(0x24, offset);
  offset += buffer.write(address, offset, 'ascii');
  offset = buffer.writeUInt8(0x00, offset);
  return offset;
}

// Help from https://github.com/plcpeople/nodepccc/blob/00b4824972baec636deb0906454f841d8b832797/nodePCCC.js
function logicalASCIIAddressInfo(address) {
  const splitString = address.split(':');
  const prefix = splitString[0].replace(/[0-9]/gi, '');
  const info = {
    prefix,
  };

  switch (prefix) {
    case 'S':
    case 'I':
    case 'N':
    case 'O':
    case 'B':
      info.addrtype = prefix;
      info.datatype = 'INT';
      info.size = 2;
      info.id = PCCCDataType.Integer;
      break;
    case 'L': // Micrologix Only
      info.addrtype = prefix;
      info.datatype = 'DINT';
      info.size = 4;
      break;
    case 'F':
      info.addrtype = prefix;
      info.datatype = 'REAL';
      info.size = 4;
      info.id = PCCCDataType.Float;
      break;
    case 'T':
      info.addrtype = prefix;
      info.datatype = 'TIMER';
      info.size = 6;
      break;
    case 'C':
      info.addrtype = prefix;
      info.datatype = 'COUNTER';
      info.size = 6;
      break;
    case 'ST':
      info.addrtype = prefix;
      info.datatype = 'STRING';
      info.size = 84;
      break;
    case 'NST': // N as string - special type to read strings moved into an integer array to support CompactLogix read-only.
      info.addrtype = prefix;
      info.datatype = 'NSTRING';
      info.size = 44;
      break;
    case 'R':
      info.addrtype = prefix;
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

function TypedReadParserDataInfo(data, offset = 0) {
  const flag = data.readUInt8(offset); offset += 1;

  let typeID;
  let size;

  if (getBits(flag, 7, 8)) {
    const dataTypeBytes = getBits(flag, 4, 7);
    switch (dataTypeBytes) {
      case 1:
        typeID = data.readUInt8(offset);
        break;
      case 2:
        typeID = data.readUInt16LE(offset);
        break;
      case 4:
        typeID = data.readUInt32LE(offset);
        break;
      default:
      //
    }
    offset += dataTypeBytes;
  } else {
    typeID = getBits(flag, 4, 7);
  }

  if (getBits(flag, 3, 4)) {
    const dataTypeSizeBytes = getBits(flag, 0, 3);
    switch (dataTypeSizeBytes) {
      case 1:
        size = data.readUInt8(offset);
        break;
      case 2:
        size = data.readUInt16LE(offset);
        break;
      case 4:
        size = data.readUInt32LE(offset);
        break;
      default:
      //
    }
    offset += dataTypeSizeBytes;
  } else {
    size = getBits(flag, 0, 4);
  }

  return {
    offset,
    typeID,
    size,
  };
}

function __TypedReadReplyParser(data, offset, info) {
  let value;

  switch (info.typeID) {
    case PCCCDataType.Binary:
    case PCCCDataType.BitString:
    case PCCCDataType.Byte:
      value = data.readUInt8(offset);
      break;
    case PCCCDataType.Integer:
      value = data.readUInt16LE(offset);
      break;
    case PCCCDataType.Float:
      value = data.readFloatLE(offset);
      break;
    case PCCCDataType.Array: {
      value = [];
      const arrayInfo = TypedReadParserDataInfo(data, offset);
      let currentOffset = arrayInfo.offset;
      const lastOffset = info.offset + info.size;
      while (currentOffset < lastOffset) {
        value.push(__TypedReadReplyParser(data, currentOffset, arrayInfo));
        currentOffset += arrayInfo.size;
      }
      break;
    }
    case PCCCDataType.Timer: {
      /** https://github.com/plcpeople/nodepccc/blob/13695b9a92762bb7cd1b8d3801d7abb1b797714e/nodePCCC.js#L2721 */
      const bits = data.readInt16LE(offset);
      value = {
        EN: ((bits & (1 << 15)) > 0),
        TT: ((bits & (1 << 14)) > 0),
        DN: ((bits & (1 << 13)) > 0),
        PRE: data.readInt16LE(offset + 2),
        ACC: data.readInt16LE(offset + 4),
      };
      break;
    }
    case PCCCDataType.Counter: {
      /** https://github.com/plcpeople/nodepccc/blob/13695b9a92762bb7cd1b8d3801d7abb1b797714e/nodePCCC.js#L2728 */
      const bits = data.readInt16LE(offset);
      value = {
        CN: ((bits & (1 << 15)) > 0),
        CD: ((bits & (1 << 14)) > 0),
        DN: ((bits & (1 << 13)) > 0),
        OV: ((bits & (1 << 12)) > 0),
        UN: ((bits & (1 << 11)) > 0),
        PRE: data.readInt16LE(offset + 2),
        ACC: data.readInt16LE(offset + 4),
      };
      break;
    }
    case PCCCDataType.Control: {
      /** https://github.com/plcpeople/nodepccc/blob/13695b9a92762bb7cd1b8d3801d7abb1b797714e/nodePCCC.js#L2737 */
      const bits = data.readInt16LE(offset);
      value = {
        EN: ((bits & (1 << 15)) > 0),
        EU: ((bits & (1 << 14)) > 0),
        DN: ((bits & (1 << 13)) > 0),
        EM: ((bits & (1 << 12)) > 0),
        ER: ((bits & (1 << 11)) > 0),
        UL: ((bits & (1 << 10)) > 0),
        IN: ((bits & (1 << 9)) > 0),
        FD: ((bits & (1 << 8)) > 0),
        LEN: data.readInt16LE(offset + 2),
        POS: data.readInt16LE(offset + 4),
      };
      break;
    }

    default:
      console.log(`PCCC Error: Unknown Type: ${info.typeID}`);
  }
  return value;
}

function dataTypeAttributeAdditionalEncodingLength(value) {
  if (value < 7) {
    return 0;
  }
  return unsignedIntegerSize(value);
}

function dataTypeEncodingLength(id, size) {
  const idLength = dataTypeAttributeAdditionalEncodingLength(id);
  const sizeLength = dataTypeAttributeAdditionalEncodingLength(size);

  if (idLength === 0 && sizeLength === 0) {
    return 1;
  }

  if (idLength > 0 && sizeLength === 0) {
    return 1 + idLength;
  }

  if (idLength === 0 && sizeLength > 0) {
    return 1 + sizeLength;
  }

  if (idLength > 0 && sizeLength > 0) {
    return 1 + idLength + sizeLength;
  }

  throw new Error(`Unable to encode data type with id ${id} and size ${size}`);
}

function encodeDataType(data, offset, id, size) {
  const idLength = dataTypeAttributeAdditionalEncodingLength(id);
  const sizeLength = dataTypeAttributeAdditionalEncodingLength(size);

  if (idLength === 0 && sizeLength === 0) {
    return data.writeUInt8((id << 4) | size, offset);
  }

  if (idLength > 0 && sizeLength === 0) {
    offset = data.writeUInt8(((0b1000 | idLength) << 4) | size, offset);
    return encodeUnsignedInteger(data, offset, id, idLength);
  }

  if (idLength === 0 && sizeLength > 0) {
    offset = data.writeUInt8((id << 4) | (0b1000 | sizeLength), offset);
    return encodeUnsignedInteger(data, offset, size, sizeLength);
  }

  if (idLength > 0 && sizeLength > 0) {
    offset = data.writeUInt8(((0b1000 | idLength) << 4) | (0b1000 | sizeLength));
    offset = encodeUnsignedInteger(data, offset, id, idLength);
    return encodeUnsignedInteger(data, offset, size, sizeLength);
  }

  throw new Error(`Unable to encode data type with id ${id} and size ${size}`);
}

function typedWriteEncodeValue(buffer, offset, type, value) {
  switch (type) {
    case PCCCDataType.Binary:
    case PCCCDataType.Byte:
      return buffer.writeUInt8(value, offset);
    case 'INT':
    case PCCCDataType.Integer:
      return buffer.writeUInt16LE(value, offset);
    case 'DINT':
      return buffer.writeUInt32LE(value, offset);
    case 'REAL':
    case PCCCDataType.Float:
      return buffer.writeFloatLE(value, offset);
    default:
      throw new Error(`Unable to encode value of type: ${type}`);
  }
}

class PCCCPacket {
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
  static fromBufferRequest(buffer) {
    const packet = new PCCCPacket();

    let offset = 0;
    packet.service = buffer.readUInt8(offset); offset += 1;
    const pathSize = 2 * buffer.readUInt8(offset); offset += 1;
    packet.path = buffer.slice(offset, offset + pathSize); offset += pathSize;
    const requestorIDLength = buffer.readUInt8(offset); offset += 1;
    packet.requestorID = buffer.slice(offset, offset + requestorIDLength); // includes length
    packet.vendorID = buffer.slice(offset, offset + 2); offset += 2;
    packet.serialNumber = buffer.slice(offset, offset + 4); offset += 4;

    if (requestorIDLength > 7) {
      packet.other = buffer.slice(offset, offset + requestorIDLength - 7);
      offset += requestorIDLength - 7;
    }

    packet.command = buffer.readUInt8(offset); offset += 1;
    packet.status.code = buffer.readUInt8(offset); offset += 1;
    packet.transaction = buffer.readUInt16LE(offset); offset += 2;
    packet.data = buffer.slice(offset);

    return packet;
  }

  static fromBufferReply(buffer) {
    const packet = new PCCCPacket();

    let offset = 0;
    packet.raw = buffer;
    packet.command = buffer.readUInt8(offset); offset += 1;
    packet.status.code = buffer.readUInt8(offset); offset += 1;
    packet.status.description = STSCodeDescriptions[packet.status.code] || '';

    // if (buffer.length < 4) {
    //   return packet;
    // }

    packet.transaction = buffer.readUInt16LE(offset); offset += 2;

    if (packet.status.code === 0xF0) {
      packet.status.extended.code = buffer.readUInt8(offset); offset += 1;
      packet.status.extended.description = EXTSTSCodeDescriptionsCMDF0[packet.status.extended.code] || '';
    }

    packet.data = buffer.slice(offset);

    return packet;
  }

  encode() {
    return encode(this.command, this.status.code, this.transaction, this.data);
  }

  static Encode(command, status, transaction, data) {
    return encode(command, status, transaction, data);
  }

  static WordRangeReadRequest(transaction, address, words) {
    const info = logicalASCIIAddressInfo(address);
    if (!info) {
      throw new Error(`Unsupported address: ${address}`);
    }

    let offset = 0;
    const data = Buffer.allocUnsafe(9 + address.length);
    offset = data.writeUInt8(0x01, offset); // Function

    /**
     * PACKET OFFSET
     * Contains the offset in words from the address in the in the address field.
     * For example, if the previous command read the maximum 244 bytes, the next
     * offset should be 122.
     */
    offset = data.writeUInt16LE(0, offset);

    /**
     * TOTAL TRANSACTION
     * Indicates the total amount of PLC-3 data table words (low byte first)
     * that are transferred for the entire transaction.
     */
    offset = data.writeUInt16LE(words, offset);

    /**
     * ADDRESS
     */
    offset = encodeLogicalASCIIAddress(address, data, offset); // PLC system address
    // offset = data.writeUInt8(info.size, offset);

    /**
     * SIZE
     * Specifies how many bytes of PLC-3 data table information you read in this transaction.
     * The word range read command reads a maximum of 244 bytes per message packet.
     */
    const size = 2 * words;
    if (size > 244) {
      throw new Error(`Maximum size of a single word range read transaction is 244. Received: ${size}`);
    }

    data.writeUInt8(size, offset);

    return new PCCCPacket(0x0F, 0, transaction, data);
  }

  // static WordRangeReadRequest(transaction, address, words) {
  //   const info = logicalASCIIAddressInfo(address);
  //   if (!info) {
  //     throw new Error(`Unsupported address: ${address}`);
  //   }

  //   let offset = 0;
  //   const data = Buffer.allocUnsafe(9 + address.length);
  //   offset = data.writeUInt8(0x01, offset); // Function
  //   offset = data.writeUInt16LE(0, offset); /** Packet offset */
  //   offset = data.writeUInt16LE(1, offset); // Total Trans
  //   offset = encodeLogicalASCIIAddress(address, data, offset); // PLC system address
  //   offset = data.writeUInt8(info.size, offset);
  //   return new PCCCPacket(0x0F, 0, transaction, data);
  // }

  static WordRangeReadReply(buffer) {
    // I believe there is a mistake in the DF1 manual,
    // The reply message should still contain a TNS
    return PCCCPacket.fromBufferReply(buffer);
  }

  static TypedReadRequest(transaction, address, items) {
    // const info = logicalASCIIAddressInfo(address);
    // if (!info) {
    //   throw new Error(`Unsupported address: ${address}`);
    // }

    let offset = 0;
    const data = Buffer.allocUnsafe(10 + address.length);
    offset = data.writeUInt8(0x68, offset); // function
    offset = data.writeUInt16LE(0, offset); /** Packet offset */
    // offset = data.writeUInt16LE((items * info.size / 2) + 1, offset); // Total Trans
    offset = data.writeUInt16LE(items, offset); // Total Trans
    offset = encodeLogicalASCIIAddress(address, data, offset); // PLC system address
    data.writeUInt16LE(items, offset); // Size, number of elements to read
    return new PCCCPacket(0x0F, 0, transaction, data);
  }

  static ParseTypedReadData(data, offset = 0) {
    const info = TypedReadParserDataInfo(data, offset);
    return __TypedReadReplyParser(data, info.offset, info);
  }

  static TypedWriteRequest(transaction, address, values) {
    const info = logicalASCIIAddressInfo(address);

    const valueCount = values.length;
    const dataValueLength = valueCount * info.size;
    const dataTypeLength = dataTypeEncodingLength(info.id, info.size);
    const dataLength = 5 + (address.length + 3) + dataTypeLength + dataValueLength;

    let offset = 0;
    const data = Buffer.allocUnsafe(dataLength);
    offset = data.writeUInt8(0x67, offset); /** function */
    offset = data.writeUInt16LE(0, offset); /** Packet offset */
    offset = data.writeUInt16LE(valueCount, offset); /** total transmitted */
    offset = encodeLogicalASCIIAddress(address, data, offset); /** PLC-5 system address */

    offset = encodeDataType(data, offset, info.id, info.size);

    for (let i = 0; i < valueCount; i++) {
      offset = typedWriteEncodeValue(data, offset, info.datatype, values[i]);
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

  static UnprotectedWrite(transaction, address, writeData) {
    const buffer = Buffer.allocUnsafe(2 + writeData.length);
    buffer.writeUInt16LE(address, 0);
    writeData.copy(buffer, 2);
    return new PCCCPacket(0x08, 0, transaction, buffer);
  }

  // static Upload(transaction) {
  //   return new PCCCPacket(0x0F, 0, transaction, Buffer.from([0x06]));
  // }

  // static UploadCompleted(transaction) {
  //   return new PCCCPacket(0x0F, 0, transaction, Buffer.from([0x55]));
  // }
}

module.exports = PCCCPacket;

// const PCCCDataTypeSize = {
//   [PCCCDataType.Binary]: 1,
//   [PCCCDataType.BitString]: 1,
//   [PCCCDataType.Byte]: 1,
//   [PCCCDataType.Integer]: 2,
//   [PCCCDataType.Timer]: 6,
//   [PCCCDataType.Counter]: 6,
//   [PCCCDataType.Control]: 6,
//   [PCCCDataType.Float]: 4
// };

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

// function __TypedReadReplyParser(data, info) {
//   let value;
//   const offset = info.offset;

//   switch (info.typeID) {
//     case PCCCDataType.Binary:
//     case PCCCDataType.BitString:
//     case PCCCDataType.Byte:
//       value = data.readUInt8(offset);
//       break;
//     case PCCCDataType.Integer:
//       value = data.readInt16LE(offset);
//       break;
//     case PCCCDataType.Float:
//       value = data.readFloatLE(offset);
//       break;
//     case PCCCDataType.Array: {
//       value = [];
//       const arrayInfo = TypedReadParserDataInfo(data, offset);
//       let currentOffset = arrayInfo.offset;
//       const lastOffset = info.offset + info.size;
//       console.log({
//         info,
//         arrayInfo,
//         currentOffset,
//         lastOffset
//       });
//       while (currentOffset < lastOffset) {
//         value.push(__TypedReadReplyParser(data, arrayInfo));
//         currentOffset += arrayInfo.size;
//         console.log({
//           currentOffset,
//           lastOffset
//         })
//       }
//       break;
//     }
//     case PCCCDataType.Timer: {
//       /** https://github.com/plcpeople/nodepccc/blob/13695b9a92762bb7cd1b8d3801d7abb1b797714e/nodePCCC.js#L2721 */
//       const bits = data.readInt16LE(offset);
//       value = {
//         EN: ((bits & (1 << 15)) > 0),
//         TT: ((bits & (1 << 14)) > 0),
//         DN: ((bits & (1 << 13)) > 0),
//         PRE: data.readInt16LE(offset + 2),
//         ACC: data.readInt16LE(offset + 4)
//       };
//       break;
//     }
//     case PCCCDataType.Counter: {
//       /** https://github.com/plcpeople/nodepccc/blob/13695b9a92762bb7cd1b8d3801d7abb1b797714e/nodePCCC.js#L2728 */
//       const bits = data.readInt16LE(offset);
//       value = {
//         CN: ((bits & (1 << 15)) > 0),
//         CD: ((bits & (1 << 14)) > 0),
//         DN: ((bits & (1 << 13)) > 0),
//         OV: ((bits & (1 << 12)) > 0),
//         UN: ((bits & (1 << 11)) > 0),
//         PRE: data.readInt16LE(offset + 2),
//         ACC: data.readInt16LE(offset + 4)
//       };
//       break;
//     }
//     case PCCCDataType.Control: {
//       /** https://github.com/plcpeople/nodepccc/blob/13695b9a92762bb7cd1b8d3801d7abb1b797714e/nodePCCC.js#L2737 */
//       const bits = data.readInt16LE(offset);
//       value = {
//         EN: ((bits & (1 << 15)) > 0),
//         EU: ((bits & (1 << 14)) > 0),
//         DN: ((bits & (1 << 13)) > 0),
//         EM: ((bits & (1 << 12)) > 0),
//         ER: ((bits & (1 << 11)) > 0),
//         UL: ((bits & (1 << 10)) > 0),
//         IN: ((bits & (1 << 9)) > 0),
//         FD: ((bits & (1 << 8)) > 0),
//         LEN: data.readInt16LE(offset + 2),
//         POS: data.readInt16LE(offset + 4)
//       };
//       break;
//     }

//     default:
//       console.log('PCCC Error: Unknown Type: ' + info.typeID);
//   }
//   console.log(value);
//   return value;
// }
