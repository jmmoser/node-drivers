'use strict';

const { getBit, getBits } = require('../../utils');


class PCCCPacket {
  constructor(command = 0, status = 0, transaction = 0, data) {
    this.command = command;
    this.transaction = transaction;
    this.data = data;

    this.status = {
      code: status,
      extended: {
        code: 0
      }
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
      packet.other = buffer.slice(offset, offset + requestorIDLength - 7); offset += requestorIDLength - 7;
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
      packet.status.extended.description = EXTSTSCodeDescriptions_CMD_F0[packet.status.extended.code] || '';
    }

    packet.data = buffer.slice(offset);

    return packet;
  }

  toBuffer() {
    return toBuffer(
      this.command,
      this.status.code,
      this.transaction,
      this.data
    );
  }

  static toBuffer(command, status, transaction, data) {
    return toBuffer(command, status, transaction, data);
  }


  static WordRangeReadRequest(transaction, address) {
    const info = logicalASCIIAddressInfo(address);
    if (!info) {
      return null;
    }

    const packet = new PCCCPacket(0x0F, 0, transaction);

    const data = Buffer.alloc(200);
    let offset = 0;
    offset = data.writeUInt8(0x01, offset); // Function
    offset = data.writeUInt16LE(0, offset); /** Packet offset */
    offset = data.writeUInt16LE(1, offset); // Total Trans
    offset = logicalASCIIAddress(address, data, offset); // PLC system address
    offset = data.writeUInt8(info.size, offset);
    packet.data = data.slice(0, offset);
    return packet.toBuffer();
  }

  static WordRangeReadReply(buffer) {
    // I believe there is a mistake in the DF1 manual,
    // The reply message should still contain a TNS
    return PCCCPacket.fromBufferReply(buffer);
  }


  static TypedReadRequest(transaction, address, items) {
    const packet = new PCCCPacket(0x0F, 0, transaction);

    const data = Buffer.alloc(200);
    let offset = 0;
    offset = data.writeUInt8(0x68, offset); // function
    offset = data.writeUInt16LE(0, offset); /** Packet offset */
    offset = data.writeUInt16LE(items, offset); // Total Trans
    offset = logicalASCIIAddress(address, data, offset); // PLC system address
    offset = data.writeUInt16LE(items, offset); // Size, number of elements to read from the specified system address
    packet.data = data.slice(0, offset);

    return packet.toBuffer();
  }

  static ParseTypedReadData(data) {
    // console.log(data);
    return TypedReadReplyParser(data);
  }


  static TypedWriteRequest(transaction, address, values) {
    const valueCount = values.length;

    const info = logicalASCIIAddressInfo(address);

    const dataLength = 5 + (address.length + 3) + 1 + (info.size * valueCount);

    let offset = 0;
    const data = Buffer.allocUnsafe(dataLength);
    offset = data.writeUInt8(0x67, offset); /** function */
    offset = data.writeUInt16LE(0, offset); /** Packet offset */
    offset = data.writeUInt16LE(valueCount, offset); /** total transmitted */
    offset = logicalASCIIAddress(address, data, offset); /** PLC-5 system address */
    offset = data.writeUInt8(info.dataType << 4 | info.size, offset); /** Type/data */

    for (let i = 0; i < valueCount; i++) {
      offset = EncodeValue(info.datatype, values[i], data, offset);
    }

    const packet = new PCCCPacket(0x0F, 0, transaction, data);
    // console.log(packet);

    return packet.toBuffer();
  }


  static DiagnosticStatusRequest(transaction) {
    return toBuffer(0x06, 0, transaction, Buffer.from([0x03]));
  }

  static EchoRequest(transaction, data) {
    if (!Buffer.isBuffer(data)) {
      data = Buffer.alloc(0);
    }
    const buffer = Buffer.allocUnsafe(data.length + 1);
    buffer.writeUInt8(0, 0);
    data.copy(buffer, 1);
    return new PCCCPacket(0x06, 0, transaction, buffer).toBuffer();
  }


  static UnprotectedRead(transaction, address, size) {
    const data = Buffer.alloc(3);
    data.writeUInt16LE(address, 0);
    data.writeUInt8(size, 2);
    return toBuffer(0x01, 0, transaction, data);
  }

  static UnprotectedWrite(transaction, address, writeData) {
    const writeDataLength = writeData.length;
    const data = Buffer.alloc(2 + writeDataLength);
    data.writeUInt16LE(address, 0);
    writeData.copy(data, 2);
    return toBuffer(0x08, 0, transaction, data);
  }

  // static Upload(transaction) {
  //   return toBuffer(0x0F, 0, transaction, Buffer.from([0x06]));
  // }

  // static UploadCompleted(transaction) {
  //   return toBuffer(0x0F, 0, transaction, Buffer.from([0x55]));
  // }
}

module.exports = PCCCPacket;


function toBuffer(command, status, transaction, data = []) {
  const buffer = Buffer.alloc(4 + data.length);
  buffer.writeUInt8(command, 0);
  buffer.writeUInt8(status, 1);
  buffer.writeUInt16LE(transaction, 2);
  if (data.length > 0) {
    data.copy(buffer, 4);
  }
  return buffer;
}


function logicalASCIIAddress(address, buffer, offset = 0) {
  offset = buffer.writeUInt8(0x00, offset);
  offset = buffer.writeUInt8(0x24, offset);
  offset += buffer.write(address, offset, 'ascii');
  offset = buffer.writeUInt8(0x00, offset);
  return offset;
}



function TypedWriteEncodeValue(buffer, offset, info, value) {

}

function EncodeValue(type, value, buffer, offset) {
  switch (type) {
    case 'INT':
    case PCCCDataType.Integer:
      buffer.writeInt16LE(value, offset);
      offset += 2;
      break;
    case 'DINT':
      buffer.writeInt32LE(value, offset);
      offset += 4;
      break;
    case 'REAL':
    case PCCCDataType.Float:
      buffer.writeFloatLE(value, offset);
      offset += 4;
      break;
    default:
      break;
  }
  return offset;
}


// Help from https://github.com/plcpeople/nodepccc/blob/00b4824972baec636deb0906454f841d8b832797/nodePCCC.js
function logicalASCIIAddressInfo(address) {
  const splitString = address.split(':');
  const prefix = splitString[0].replace(/[0-9]/gi, '');
  const info = {
    prefix
  };

  switch (prefix) {
    case "S":
    case "I":
    case "N":
    case "O":
    case "B":
      info.addrtype = prefix;
      info.datatype = "INT";
      info.size = 2;
      info.dataType = PCCCDataType.Integer;
      break;
    case "L": // Micrologix Only
      info.addrtype = prefix;
      info.datatype = "DINT";
      info.size = 4;
      break;
    case "F":
      info.addrtype = prefix;
      info.datatype = "REAL";
      info.size = 4;
      info.dataType = PCCCDataType.Float;
      break;
    case "T":
      info.addrtype = prefix;
      info.datatype = "TIMER";
      info.size = 6;
      break;
    case "C":
      info.addrtype = prefix;
      info.datatype = "COUNTER";
      info.size = 6;
      break;
    case "ST":
      info.addrtype = prefix;
      info.datatype = "STRING";
      info.size = 84;
      break;
    case "NST": // N as string - special type to read strings moved into an integer array to support CompactLogix read-only.
      info.addrtype = prefix;
      info.datatype = "NSTRING";
      info.size = 44;
      break;
    case "R":
      theItem.addrtype = prefix;
      theItem.datatype = "CONTROL";
      theItem.size = 6;
      break;
    case "A":	// TODO - support this.
    default:
      outputLog(`Failed to find a match for ${splitString[0]} possibly because ${prefix} type is not supported yet.`);
      return undefined;
  }
  return info;
}


const PCCCDataType = {
  Binary: 1,
  BitString: 2,
  Byte: 3,
  Integer: 4,
  Timer: 5,
  Counter: 6,
  Control: 7,
  Float: 8,
  Array: 9,
  Address: 0xf,
  BCD: 0x10,
  PID: 0x15,
  Message: 0x16,
  SFCStatus: 0x1d,
  String: 0x1e,
  BlockTransfer: 0x20
};



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


function TypedReadReplyParser(data, offset = 0) {
  const info = TypedReadParserDataInfo(data, offset);
  return __TypedReadReplyParser(data, info);
}


function __TypedReadReplyParser(data, info) {
  let value;
  const offset = info.offset;

  switch (info.typeID) {
    case PCCCDataType.Binary:
    case PCCCDataType.BitString:
    case PCCCDataType.Byte:
      value = data.readUInt8(offset);
      break;
    case PCCCDataType.Integer:
      value = data.readInt16LE(offset);
      break;
    case PCCCDataType.Float:
      value = data.readFloatLE(offset);
      break;
    case PCCCDataType.Array: {
      value = [];
      const arrayInfo = TypedReadParserDataInfo(data, offset);
      let currentOffset = offset;
      const lastOffset = offset + info.size;
      while (currentOffset < lastOffset) {
        value.push(__TypedReadReplyParser(data, arrayInfo));
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
        ACC: data.readInt16LE(offset + 4)
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
        ACC: data.readInt16LE(offset + 4)
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
        POS: data.readInt16LE(offset + 4)
      };
      break;
    }

    default:
      console.log('PCCC Error: Unknown Type: ' + info.typeID);
  }
  return value;
}


function TypedReadParserDataInfo(data, offset = 0) {
  const flag = data.readUInt8(offset); offset += 1;

  let typeID = 0;
  let size = 0;

  if (getBit(flag, 7)) {
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

  if (getBit(flag, 3)) {
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
    size
  };
}


const STSCodeDescriptions = {
  0: 'Success',

  1: 'Local: DST node is out of buffer space',
  2: 'Local: Cannot guarantee delivery: link layer (The remote node specified does not ACK command)',
  3: 'Local: Duplicate token holder detected',
  4: 'Local: Local port is disconnected',
  5: 'Local: Application layer timed out waiting for a response',
  6: 'Local: Duplicate node detected',
  7: 'Local: Station is offline',
  8: 'Local: Hardware fault',

  16: 'Remote: Illegal command or format',
  32: 'Remote: Host has a problem and will not communicate',
  48: 'Remote: Remote node host is missing, disconnected, or shut down',
  64: 'Remote: Host could not complete function due to hardware fault',
  80: 'Remote: Addressing problem or memory protect rungs',
  96: 'Remote: Function not allowed due to command protection selection',
  112: 'Remote: Processor is in Program mode',
  128: 'Remote: Compatibility mode file missing or communication zone problem',
  144: 'Remote: Remote node cannot buffer command',
  160: 'Remote: Wait ACK (1775-KA buffer full)',
  176: 'Remote: Remote node problem due to download',
  192: 'Remote: Wait ACK (1775-KA buffer full)',
  240: 'Remote: Error code in the EXT STS byte'
};

/** DF1 Manual, p. 8-4 */
const EXTSTSCodeDescriptions_CMD_F0 = {
  // 0: 'Not Used',
  1: 'A field has an illegal value',
  2: 'Less levels specified in address than minimum for any address',
  3: 'More levels specified in address than system supports',
  4: 'Symbol not found',
  5: 'Symbol is of improper format',
  6: 'Address doesn\'t point to something usable',
  7: 'File is wrong size',
  8: 'Cannot complete request, situation has changed since the start of the command',
  9: 'Data or file is too large',
  10: 'Transaction size plus word address is too large',
  11: 'Access denied, impropert privilege',
  12: 'Condition cannot be generated - resource is not available',
  13: 'Condition already exists - resource is already available',
  14: 'Command cannot be executed',
  15: 'Histogram overflow',
  16: 'No access',
  17: 'Illegal data type',
  18: 'Invalid parameter or invalid data',
  19: 'Address reference exists to deleted area',
  20: 'Command execution failure for unknown reason; possible PLC-3 histogram overflow',
  21: 'Data conversion error',
  22: 'Scanner not able to communicate with 1771 rack adapter',
  23: 'Type mismatch',
  24: '1771 module response was not valid',
  25: 'Duplicated label',
  26: 'File is open; another node owns it',
  27: 'Another node is the program owner',
  // 28: 'Reserved',
  // 29: 'Reserved',
  30: 'Data table element protection violation',
  31: 'Temporary internal problem',

  34: 'Remote rack fault',
  35: 'Timeout',
  36: 'Unknown error'
};
