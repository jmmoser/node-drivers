'use strict';

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

// http://stackoverflow.com/a/10090443/3055415
function getBits(k, m, n) {
  return ((k >> m) & ((1 << (n - m)) - 1));
  // return last(k >> m, n - m);
}

function getBit(k, n) {
  return ((k) & (1 << n)) > 0 ? 1 : 0;
}


function TypedReadReplyParserArray(data) {
  let info = TypedReadParserInfo(data);
  let offset = info.Length;
  let values = [];

  let readFunction = null;

  switch (info.DataTypeID) {
    case 3:
      readFunction = function(data, offset) {
        return String.fromCharCode(data[offset]);
      };
      break;
    case 4:
      readFunction = function(data, offset) {
        return data.readInt16LE(offset); // return data.readUInt16LE(offset);
      };
      break;
    case 8:
      readFunction = function(data, offset) {
        return data.readFloatLE(offset);
      };
      break;
    default:
      console.log('PCCC Error: Unknown Type: ' + info.DataTypeID);
  }

  if (readFunction) {
    let lastOffset = data.length - info.DataSize;

    while (offset <= lastOffset) {
      values.push(readFunction(data, offset));
      offset += info.DataSize;
    }
  }

  return values;
}

// const PCCCDataType = {
//   Binary: 1,
//   BitString: 2,
//   Byte: 3,
//   Integer: 4,
//   Timer: 5,
//   Counter: 6,
//   Control: 7,
//   Float: 8,
//   Array: 9,
//   Address: 0xf,
//   BCD: 0x10,
//   PID: 0x15,
//   Message: 0x16,
//   SFCStatus: 0x1d,
//   String: 0x1e,
//   BlockTransfer: 0x20
// };

function TypedReadReplyParser(data) {
  let info = TypedReadParserInfo(data);
  let offset = info.Length;
  let value = null;

  switch (info.DataTypeID) {
    case PCCCDataType.Binary:
    case PCCCDataType.BitString:
    case PCCCDataType.Byte:
      value = buffer.readUInt8(offset);
      break;
    case PCCCDataType.Integer:
      value = buffer.readInt32LE(offset); // buffer.readInt16LE(offset) ??
      break;
    case PCCCDataType.Float:
      value = buffer.readFloatLE(offset);
      break;
    case PCCCDataType.Array:
      value = TypedReadReplyParserArray(data.slice(offset, offset + info.DataSize));
      break;
    default:
      console.log('PCCC Error: Unknown Type: ' + info.DataTypeID);
  }
  return value;
}


function TypedReadParserInfo(data) {
  let offset = 0;
  let flag = data.readUInt8(offset); offset += 1;

  let dataTypeID = 0;
  let dataSize = 0;

  if (getBit(flag, 7)) {
    let dataTypeBytes = getBits(flag, 4, 7);
    switch (dataTypeBytes) {
      case 1:
        dataTypeID = data.readUInt8(offset);
        break;
      case 2:
        dataTypeID = data.readUInt16LE(offset);
        break;
      case 4:
        dataTypeID = data.readUInt32LE(offset);
        break;
      default:
        //
    }
    offset += dataTypeBytes;
  } else {
    dataTypeID = getBits(flag, 4, 7);
  }

  if (getBit(flag, 3)) {
    let dataTypeSizeBytes = getBits(flag, 0, 3);
    switch (dataTypeSizeBytes) {
      case 1:
        dataSize = data.readUInt8(offset);
        break;
      case 2:
        dataSize = data.readUInt16LE(offset);
        break;
      case 4:
        dataSize = data.readUInt32LE(offset);
        break;
      default:
        //
    }
    offset += dataTypeSizeBytes;
  } else {
    dataSize = getBits(flag, 0, 4);
  }

  return {
    Length: offset,
    DataTypeID: dataTypeID,
    DataSize: dataSize
  };
}



// Programmable Controller Communication Command
class PCCCPacket {
  constructor() {
    // Header
    this.Service = 0x4B;
    this.setPath(Buffer.from([0x20, 0x67, 0x24, 0x01]));
    this.setRequestor(Buffer.from([0x07, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03]));

    // Message
    this.Command = 0;
    this.Status = 0;
    this.Transaction = 0;

    this.ExtendedStatus = 0;
  }

  setPath(pathBuffer) {
    if (Buffer.isBuffer(pathBuffer)) {
      if (pathBuffer.length % 2 === 0) {
        this.Path = pathBuffer;
      } else {
        console.log('PCCC Error: Set Path: Path size is not even');
      }
    } else {
      console.log('PCCC Error: Set Path: Value is not a buffer');
    }
  }

  setRequestor(requestorBuffer) {
    if (Buffer.isBuffer(requestorBuffer)) {
      let length = requestorBuffer.readUInt8(0);
      if (length === requestorBuffer.length) {
        this.Requestor = requestorBuffer;
      } else {
        console.log('PCCC Error: Set Requestor: Specified requestor length is not equal to total length of requestor buffer');
      }
    } else {
      console.log('PCCC Error: Set Requestor: Value is not a buffer');
    }
  }

  // this entire class method may not be needed
  // good for unit testing factory methods
  static fromBufferRequest(buffer) {
    let packet = new PCCCPacket();

    let offset = 0;
    packet.Service = buffer.readUInt8(offset); offset += 1;
    // packet.PathSize = 2 * buffer.readUInt8(offset); offset += 1; // PathSize is in bytes here
    // packet.Path = buffer.slice(offset, offset + packet.PathSize); offset += packet.PathSize;
    let pathSize = 2 * buffer.readUInt8(offset); offset += 1;
    packet.Path = buffer.slice(offset, offset + pathSize); offset += pathSize;
    let requestorIDLength = buffer.readUInt8(offset); offset += 1;
    packet.RequestorID = buffer.slice(offset, offset + requestorIDLength); // includes length
    packet.VendorID = buffer.slice(offset, offset + 2); offset += 2;
    packet.SerialNumber = buffer.slice(offset, offset + 4); offset += 4;
    if (requestorIDLength > 7) {
      packet.Other = buffer.slice(offset, offset + requestorIDLength - 7); offset += requestorIDLength - 7;
    }

    packet.Command = buffer.readUInt8(offset); offset += 1;
    packet.Status = buffer.readUInt8(offset); offset += 1;
    packet.Transaction = buffer.readUInt16LE(offset); offset += 2;
    packet.Data = buffer.slice(offset);

    return packet;
  }

  static fromBufferReply(buffer) {
    let packet = new PCCCPacket();
    packet.Buffer = Buffer.from(buffer); // May not be needed

    let offset = 0;
    packet.Service = buffer.readUInt8(offset); offset += 1;
    offset += 1; // Reserved
    packet.Status = buffer.readUInt8(offset); offset += 1;
    let additionalStatusSize = 2 * buffer.readUInt8(offset); offset += 1;
    if (additionalStatusSize > 0) {
      packet.AdditionalStatus = buffer.slice(offset, offset + additionalStatusSize); offset += additionalStatusSize;
    }

    if (packet.Status !== 0) {
      return packet;
    }
    // SHOULD HANDLE: ONLY PRESENT IN REPLY TO UNCONNECTED SEND WITH ROUTE ERROR
    // packet.RemainingPathSize = buffer.readUInt8(offset); offset += 1;

    // let requestorIDLength = buffer.readUInt8(offset); offset += 1;
    // packet.VendorID = buffer.slice(offset, offset + 2); offset += 2;
    // packet.SerialNumber = buffer.slice(offset, offset + 4); offset += 4;
    // if (requestorIDLength > 7) {
    //   packet.Other = buffer.slice(offset, offset + requestorIDLength - 7); offset += requestorIDLength - 7;
    // }

    let requestorIDLength = buffer.readUInt8(offset);
    packet.Requestor = buffer.slice(offset, offset + requestorIDLength); offset += requestorIDLength;

    packet.Command = buffer.readUInt8(offset); offset += 1;
    packet.Status = buffer.readUInt8(offset); offset += 1;

    packet.Transaction = buffer.readUInt16LE(offset); offset += 2;
    if (packet.Status === 0xF0) {
      packet.ExtendedStatus = buffer.readUInt8(offset); offset += 1;
    }

    packet.Data = buffer.slice(offset);

    if (STSCodeDescriptions[packet.Status]) {
      packet.StatusDescription = STSCodeDescriptions[packet.Status];
    }

    if (packet.ExtendedStatus !== 0x00 && EXTSTSCodeDescriptions[packet.ExtendedStatus]) {
      packet.ExtendedStatusDescription = EXTSTSCodeDescriptions[packet.ExtendedStatus];
    }

    return packet;
  }

  toBuffer() {
    if (this.Buffer) {
      // This is just for reply messages
      // Not sure why this would be needed
      return this.Buffer;
    }

    let buffer = Buffer.alloc(256); // 256 bytes should be big enough for any case
    let offset = 0;

    buffer.writeUInt8(this.Service, offset); offset += 1;
    // buffer.writeUInt8(this.PathSize, offset); offset += 1; // Path size needs to be in words
    // this.Path.copy(buffer, offset); offset += this.PathSize;
    buffer.writeUInt8(this.Path.length / 2, offset); offset += 1;
    this.Path.copy(buffer, offset); offset += this.Path.length;
    // buffer.writeUInt8(this.RequestorID.length, offset); offset += 1;
    // this.RequestorID.copy(buffer, offset); offset += this.RequestorID.length - 1;
    this.Requestor.copy(buffer, offset); offset += this.Requestor.length;
    buffer.writeUInt8(this.Command, offset); offset += 1;
    buffer.writeUInt8(this.Status, offset); offset += 1;
    buffer.writeUInt16LE(this.Transaction, offset); offset += 2;
    this.Data.copy(buffer, offset); offset += this.Data.length;
    return buffer.slice(0, offset);
  }



  static WordRangeReadRequest(transaction, address) {
    let packet = new PCCCPacket();
    packet.Command = 0x0F;
    packet.Transaction = transaction;

    let data = Buffer.alloc(200);
    let offset = 0;
    data.writeUInt8(0x01, offset); offset += 1; // Function
    offset += 2; // Packet Offset
    data.writeUInt16LE(1, offset); offset += 2; // Total Trans
    offset += logicalASCIIAddress(address, data.slice(offset)); // PLC system address
    let info = logicalASCIIAddressInfo(address);

    if (info) {
      data.writeUInt8(info.size, offset); offset += 1;
    } else {
      return null;
    }
    packet.Data = data.slice(0, offset);
    return packet.toBuffer();
  }

  static WordRangeReadReply(buffer) {
    // I believe there is a mistake in the DF1 manual,
    // The reply message should still contain a TNS
    return PCCCPacket.fromBufferReply(buffer);
  }


  static TypedReadRequest(transaction, address, items) {
    let packet = new PCCCPacket();
    packet.Command = 0x0F;
    packet.Transaction = transaction;

    let data = Buffer.alloc(200);
    let offset = 0;
    data.writeUInt8(0x68, offset); offset += 1; // function
    offset += 2; // Packet Offset
    data.writeUInt16LE(items, offset); offset += 2; // Total Trans
    offset += logicalASCIIAddress(address, data.slice(offset)); // PLC system address
    data.writeUInt16LE(items, offset); offset += 2; // Size, number of elements to read from the specified system address
    packet.Data = data.slice(0, offset);

    return packet.toBuffer();
  }

  static ParseTypedReadData(data) {
    return TypedReadReplyParser(data);
  }


  static TypedWriteRequest(transaction, address, items, values) {
    let packet = new PCCCPacket();
    packet.Command = 0x0F;
    packet.Transaction = transaction;

    let offset = 0;
    let data = Buffer.alloc(200);
    data.writeUInt8(0x67, offset); offset += 1;
    offset += 2;
    data.writeUInt16LE(items, offset);
    offset += logicalASCIIAddress(address, data.slice(offset));
    data.writeUInt16LE(items, offset); offset += 2;

    let info = logicalASCIIAddressInfo(address);

    let dataTypeSize = info.size; // PCCCDataTypeSize[dataTypeSize];
    let writeBuffer = new Buffer.alloc(items * dataTypeSize);
    // let func = PCCCWriteFunction(buffer, dataType);

    for (let i = 0; i < items; i++) {
      // func(values[i], i * dataTypeSize);
      info.writeFunction(buffer, i * dataTypeSize, values[i]);
    }

    packet.Data = Buffer.concat([data, writeBuffer], offset + items * dataTypeSize);

    return packet.toBuffer();
  }


  static DiagnosticStatusRequest(transaction) {
    let packet = new PCCCPacket();
    packet.Command = 0x06;
    packet.Transaction = transaction;

    let data = Buffer.alloc(1);
    data[0] = 0x03;
    packet.Data = data;
    return packet.toBuffer();
  }

  // static UnprotectedRead(address, transaction) {
  //   let packet = PCCCPacket();
  //   packet.Command = 0x01;
  //   packet.Transaction = transaction;
  //
  //   let data = Buffer.alloc(200);
  //   let offset = 0;
  //   data
  // }
}

module.exports = PCCCPacket;



function logicalASCIIAddress(address, buffer) {
	let offset = 0;
	buffer[offset] = 0x00; offset += 1;
	buffer[offset] = 0x24; offset += 1;
	for (let i = 0; i < address.length; i++) {
		buffer[offset] = address.charCodeAt(i); offset += 1;
	}
	buffer[offset] = 0x00; offset += 1;
  return offset;
}

function logicalASCIIAddressInfo(address) {
  let splitString = address.split(':');
  let prefix = splitString[0].replace(/[0-9]/gi, '');
  let info = {};
  switch (prefix) {
  	case "S":
  	case "I":
  	case "N":
  	case "O":
  	case "B":
  		info.addrtype = prefix;
  		info.datatype = "INT";
  		info.size = 2;
      // info.writeFunction = function(value, buffer, offset) {
      //   buffer.writeInt16LE(value, offset);
      // };
      // info.readFunction = function(buffer, offset) {
      //   return buffer.readInt16LE(offset);
      // };
      info.writeFunction = (buffer, offset, value) => buffer.writeInt16LE(value, offset);
      info.readFunction = (buffer, offset) => buffer.readInt16LE(offset);
  		break;
  	case "L": // Micrologix Only
  		info.addrtype = prefix;
  		info.datatype = "DINT";
  		info.size = 4;
      info.writeFunction = (buffer, offset, value) => buffer.writeInt32LE(value, offset);
      info.readFunction = (buffer, offset) => buffer.readInt32LE(offset);
  		break;
  	case "F":
  		info.addrtype = prefix;
  		info.datatype = "REAL";
  		info.size = 4;
      info.writeFunction = (buffer, offset, value) => buffer.writeFloatLE(value, offset);
      info.readFunction = (buffer, offset) => buffer.readFloatLE(offset);
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
  		outputLog('Failed to find a match for ' + splitString2[0] + ' possibly because ' + prefix + ' type is not supported yet.');
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

const PCCCDataTypeSize = {
  1: 1,
  2: 1,
  3: 1,
  4: 2,
  5: 6,
  6: 6,
  7: 6,
  8: 4
};

// function PCCCWriteFunction(buffer, dataType) {
//   let func;
//   switch (dataType) {
//     case 3:
//       func = buffer.writeUInt8.bind(buffer);
//       break;
//     case 4:
//       func = buffer.writeInt32LE.bind(buffer);
//       break;
//     case 8:
//       func = buffer.writeFloatLE.bind(buffer);
//       break;
//     default:
//
//   }
//   return func;
// }


const PCCCDataTypes = {
  1: 'bit',
  2: 'bit string',
  3: 'byte (or character string)',
  4: 'integer',
  5: 'Allen-Bradley timer',
  6: 'Allen-Bradley counter',
  7: 'Allen-Bradley general control structure',
  8: 'IEEE floating point',
  9: 'array of similar elements',
  15: 'address data',
  16: 'binary-coded decimal (BCD)'
};

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

const EXTSTSCodeDescriptions = {
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
