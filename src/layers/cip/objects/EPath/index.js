'use strict';

const { getBit, getBits } = require('../../../../utils');
const Segments = require('./segments');

const SEGMENT_TYPE = {
  PORT: 0x00,
  LOGICAL: 0x20,
  NETWORK: 0x40,
  SYMBOLIC: 0x60,
  DATA: 0x80,
  DATA_TYPE_CONSTRUCTED: 0xA0,
  DATA_TYPE_ELEMENTARY: 0xC0,
  RESERVED: 0xE0
};
const SEGMENT_TYPE_DESCRIPTIONS = {
  [SEGMENT_TYPE.PORT]: 'Port',
  [SEGMENT_TYPE.LOGICAL]: 'Logical',
  [SEGMENT_TYPE.NETWORK]: 'Network',
  [SEGMENT_TYPE.SYMBOLIC]: 'Symbolic',
  [SEGMENT_TYPE.DATA]: 'Data',
  [SEGMENT_TYPE.DATA_TYPE_CONSTRUCTED]: 'Data type constructed',
  [SEGMENT_TYPE.DATA_TYPE_ELEMENTARY]: 'Data type elementary',
  [SEGMENT_TYPE.RESERVED]: 'Reserved'
};


const LOGICAL_SEGMENT_TYPE = {
  CLASS_ID: 0x00,
  INSTANCE_ID: 0x04,
  MEMBER_ID: 0x08,
  CONNECTION_POINT: 0x0C,
  ATTRIBUTE_ID: 0x10,
  SPECIAL: 0x14,
  SERVICE_ID: 0x18,
  EXTENDED_LOGICAL: 0x1C
};
const LOGICAL_SEGMENT_TYPE_DESCRIPTIONS = {
  [LOGICAL_SEGMENT_TYPE.CLASS_ID]: 'Class ID',
  [LOGICAL_SEGMENT_TYPE.INSTANCE_ID]: 'Instance ID',
  [LOGICAL_SEGMENT_TYPE.MEMBER_ID]: 'Member ID',
  [LOGICAL_SEGMENT_TYPE.CONNECTION_POINT]: 'Connection point',
  [LOGICAL_SEGMENT_TYPE.ATTRIBUTE_ID]: 'Attribute ID',
  [LOGICAL_SEGMENT_TYPE.SPECIAL]: 'Special',
  [LOGICAL_SEGMENT_TYPE.SERVICE_ID]: 'Service ID',
  [LOGICAL_SEGMENT_TYPE.EXTENDED_LOGICAL]: 'Extended logical'
}

const LOGICAL_SEGMENT_FORMAT = {
  EIGHT_BIT: 0x00,
  SIXTEEN_BIT: 0x01,
  THIRTY_TWO_BIT: 0x02,
  RESERVED: 0x03
};
const LOGICAL_SEGMENT_FORMAT_DESCRIPTIONS = {
  [LOGICAL_SEGMENT_FORMAT.EIGHT_BIT]: '8-bit logical address',
  [LOGICAL_SEGMENT_FORMAT.SIXTEEN_BIT]: '16-bit logical address',
  [LOGICAL_SEGMENT_FORMAT.THIRTY_TWO_BIT]: '32-bit logical address',
  [LOGICAL_SEGMENT_FORMAT.RESERVED]: 'Reserved'
};


const LOGICAL_SEGMENT_EXTENDED_TYPE = {
  RESERVED: 0x00,
  ARRAY_INDEX: 0x01,
  INDIRECT_ARRAY_INDEX: 0x02,
  BIT_INDEX: 0x03,
  INDIRECT_BIT_INDEX: 0x04,
  STRUCTURE_MEMBER_NUMBER: 0x05,
  STRUCTURE_MEMBER_HANDLE: 0x06
};
const LOGICAL_SEGMENT_EXTENDED_TYPE_DESCRIPTIONS = {
  [LOGICAL_SEGMENT_EXTENDED_TYPE.RESERVED]: 'Reserved',
  [LOGICAL_SEGMENT_EXTENDED_TYPE.ARRAY_INDEX]: 'Array index',
  [LOGICAL_SEGMENT_EXTENDED_TYPE.INDIRECT_ARRAY_INDEX]: 'Indirect array index',
  [LOGICAL_SEGMENT_EXTENDED_TYPE.BIT_INDEX]: 'Bit index',
  [LOGICAL_SEGMENT_EXTENDED_TYPE.INDIRECT_BIT_INDEX]: 'Indirect bit index',
  [LOGICAL_SEGMENT_EXTENDED_TYPE.STRUCTURE_MEMBER_NUMBER]: 'Structure member number',
  [LOGICAL_SEGMENT_EXTENDED_TYPE.STRUCTURE_MEMBER_HANDLE]: 'Structure member handle'
};


const LOGICAL_SEGMENT_SPECIAL_TYPE_FORMAT = {
  ELECTRONIC_KEY: 0x00
};
const LOGICAL_SEGMENT_SPECIAL_TYPE_FORMAT_DESCRIPTIONS = {
  [LOGICAL_SEGMENT_SPECIAL_TYPE_FORMAT.ELECTRONIC_KEY]: 'Electronic key'
}


const NETWORK_SEGMENT_SUBTYPE = {
  SCHEDULE: 0x01,
  FIXED_TAG: 0x02,
  PRODUCTION_INHIBIT_TIME_IN_MILLISECONDS: 0x03,
  SAFETY: 0x04,
  PRODUCTION_INHIBIT_TIME_IN_MICROSECONDS: 0x10,
  EXTENDED_NETWORK: 0x1F
};
const NETWORK_SEGMENT_SUBTYPE_DESCRIPTIONS = {
  [NETWORK_SEGMENT_SUBTYPE.SCHEDULE]: 'Schedule',
  [NETWORK_SEGMENT_SUBTYPE.FIXED_TAG]: 'Fixed tag',
  [NETWORK_SEGMENT_SUBTYPE.PRODUCTION_INHIBIT_TIME_IN_MILLISECONDS]: 'Production inhibit time in milliseconds',
  [NETWORK_SEGMENT_SUBTYPE.SAFETY]: 'Safety',
  [NETWORK_SEGMENT_SUBTYPE.PRODUCTION_INHIBIT_TIME_IN_MICROSECONDS]: 'Production inhibit time in microseconds',
  [NETWORK_SEGMENT_SUBTYPE.EXTENDED_NETWORK]: 'Extended network'
};


// CIP Vol1 Appendix C-1.4.4
const SYMBOLIC_SEGMENT_EXTENDED_FORMAT = {
  DOUBLE_BYTE_CHARS: 0x20,
  TRIPLE_BYTE_CHARS: 0x40,
  NUMERIC: 0xC0
};
const SYMBOLIC_SEGMENT_EXTENDED_FORMAT_DESCRIPTIONS = {
  [SYMBOLIC_SEGMENT_EXTENDED_FORMAT.DOUBLE_BYTE_CHARS]: 'Double-byte characters',
  [SYMBOLIC_SEGMENT_EXTENDED_FORMAT.TRIPLE_BYTE_CHARS]: 'Triple-byte characters',
  [SYMBOLIC_SEGMENT_EXTENDED_FORMAT.NUMERIC]: 'Numeric'
};

const SYMBOLIC_SEGMENT_EXTENDED_FORMAT_NUMERIC = {
  USINT: 0x06,
  UINT: 0x07,
  UDINT: 0x08
};
const SYMBOLIC_SEGMENT_EXTENDED_FORMAT_NUMERIC_DESCRIPTIONS = {
  [SYMBOLIC_SEGMENT_EXTENDED_FORMAT_NUMERIC.USINT]: 'USINT',
  [SYMBOLIC_SEGMENT_EXTENDED_FORMAT_NUMERIC.UINT]: 'UINT',
  [SYMBOLIC_SEGMENT_EXTENDED_FORMAT_NUMERIC.UDINT]: 'UDINT'
};

const kSYMBOLIC_SEGMENT_FORMAT = {
  ASCII: 1,
  EXTENDED_STRING: 2
};
const kSYMBOLIC_SEGMENT_FORMAT_DESCRIPTIONS = {
  [kSYMBOLIC_SEGMENT_FORMAT.ASCII]: 'ASCII',
  [kSYMBOLIC_SEGMENT_FORMAT.EXTENDED_STRING]: 'Extended string'
};



// CIP Vol1 Appendix C-1.4.5
const DATA_SEGMENT_SUBTYPE = {
  SIMPLE_DATA: 0x00,
  ANSI_EXTENDED_SYMBOL: 0x91
};
const DATA_SEGMENT_SUBTYPE_DESCRIPTIONS = {
  [DATA_SEGMENT_SUBTYPE.SIMPLE_DATA]: 'Simple Data',
  [DATA_SEGMENT_SUBTYPE.ANSI_EXTENDED_SYMBOL]: 'ANSI Extended Symbol'
};





// // Segment type enum
// const kSEGMENT_TYPE = {
//   PORT: 1,
//   LOGICAL: 2,
//   NETWORK: 3,
//   SYMBOLIC: 4,
//   DATA: 5,
//   DATA_TYPE_CONSTRUCTED: 6,
//   DATA_TYPE_ELEMENTARY: 7,
//   RESERVED: 8
// };
//
// const kLOGICAL_SEGMENT_TYPE = {
//   CLASS_ID: 1,
//   INSTANCE_ID: 2,
//   MEMBER_ID: 3,
//   CONNECTION_POINT: 4,
//   ATTRIBUTE_ID: 5,
//   SPECIAL: 6,
//   SERVICE_ID: 7,
//   EXTENDED_LOGICAL: 8
// };
//
// const kEXTENDED_LOGICAL_TYPE = {
//   RESERVED: 1,
//   ARRAY_INDEX: 2,
//   INDIRECT_ARRAY_INDEX: 3,
//   BIT_INDEX: 4,
//   INDIRECT_BIT_INDEX: 5,
//   STRUCTURE_MEMBER_NUMBER: 6,
//   STRUCTURE_MEMBER_HANDLE: 7
// };
//
// const kNETWORK_SEGMENT = {
//   RESERVED: 1,
//   SCHEDULE: 2,
//   FIXED_TAG: 3,
//   PRODUCTION_INHIBIT_TIME_IN_MILLISECONDS: 4,
//   SAFETY: 5,
//   PRODUCTION_INHIBIT_TIME_IN_MICROSECONDS: 6,
//   EXTENDED_NETWORK: 7
// };
//
// const kDATA_SEGMENT_SUBTYPE = {
//   RESERVED: 1,
//   SIMPLE_DATA: 2,
//   ANSI_EXTENDED_SYMBOL: 3
// };
//
// const kSYMBOLIC_SEGMENT_EXTENDED_FORMAT = {
//   DOUBLE_BYTE_CHARS: 1,
//   TRIPLE_BYTE_CHARS: 2,
//   NUMERIC_SYMBOL_USINT: 3,
//   NUMERIC_SYMBOL_UINT: 4,
//   NUMERIC_SYMBOL_UDINT: 5,
//   RESERVED: 6
// };



function __getDescription(descriptions, code, unknown) {
  let description = descriptions[code];
  if (!description) description = unknown || 'Unknown';
  return unknown;
}


function getSegmentType(buffer, offset) {
  const SEGMENT_TYPE_MASK = 0xE0;
  return buffer.readUInt8(offset) & SEGMENT_TYPE_MASK;
}

function setSegmentType(buffer, offset, type) {
  return buffer.writeUInt8(buffer.readUInt8(offset) | type, offset);
}

function getSegmentTypeDescription(segmentType) {
  return __getDescription(SEGMENT_TYPE_DESCRIPTIONS, segmentType);
}



function getPortSegmentExtendedLinkAddressSizeBit(buffer, offset) {
  // const EXTENDED_LINK_ADDRESS_SIZE_MASK = 0x10;
  // return EXTENDED_LINK_ADDRESS_SIZE_MASK === (path.readUInt8(offset) & EXTENDED_LINK_ADDRESS_SIZE_MASK);
  return getBit(buffer.readUInt8(offset), 4);
}

function getPortSegmentPortIdentifier(path, offset) {
  const PORT_IDENTIFIER_MASK = 0x0F;
  // __ASSERT(getPathPortSegmentPortIdentifier(path, offset) === SEGMENT_TYPE.PORT, 'Segment type is not Port');
  // __ASSER(path[offset] & PORT_IDENTIFIER_MASK === 0, 'Port cannot be 0');
  return path.readUInt8(offset) & PORT_IDENTIFIER_MASK;
}

function setPortSegmentPortIdentifier(buffer, offset, identifier) {
  return buffer.writeUInt8(buffer.readUInt8(offset) | identifier, offset);
}


function getPortSegmentLinkAddressSize(buffer, offset) {
  return buffer.readUInt8(offset + 1);
}

function getPortSegmentExtendedPortNumber(buffer, offset) {
  // __ASSERT(getPathPortSegmentPortIdentifier(buffer, offset) === SEGMENT_TYPE.PORT, 'Segment type is not Port');
  const position = getPortSegmentExtendedLinkAddressSizeBit(buffer, offset) === true ? 2 : 1;
  // return buffer[offset + position] + (buffer[offset + possition + 1] << 8);
  return buffer.readUInt16LE(offset + position);
}

function setPortSegmentExtendedPortIdentifier(buffer, offset, identifier) {
  setPathPortSegmentPortIdentifier(buffer, offset, identifier);
  const position = getPortSegmentExtendedLinkAddressSizeBit(buffer, offset) === true ? 2 : 1;
  // buffer[offset + position] = identifier & 0x00FF;
  // buffer[offset + position + 1] = identifier & 0xFF00 >> 8;
  return buffer.writeUInt16LE(offset + position, identifier);
}




function getLogicalSegmentLogicalType(buffer, offset) {
  const LOGICAL_TYPE_MASK = 0x1C;
  return buffer.readUInt8(offset) & LOGICAL_TYPE_MASK;
}
// function getLogicalSegmentLogicalTypeDescription(type) {
//   return __getDescription(LOGICAL_SEGMENT_TYPE_DESCRIPTIONS, type);
// }


function getLogicalSegmentLogicalFormat(path, offset) {
  const LOGICAL_FORMAT_MASK = 0x03;
  return path.readUInt8(offset) & LOGICAL_FORMAT_MASK;
}
function getLogicalSegmentLogicalFormatDescription(format) {
  return __getDescription(LOGICAL_SEGMENT_FORMAT_DESCRIPTIONS, format);
}


function getLogicalSegmentExtendedLogicalType(path, offset) {
  return path.readUInt8(offset);
}
function getLogicalSegmentExtendedLogicalTypeDescription(type) {
  return __getDescription(LOGICAL_SEGMENT_EXTENDED_TYPE_DESCRIPTIONS, type);
}


function getLogicalSegmentSpecialTypeLogicalType(path, offset) {
  const LOGICAL_FORMAT_MASK = 0x03;
  return path.readUInt8(offset) & LOGICAL_FORMAT_MASK;
}
function getLogicalSegmentSpecialTypeLogicalTypeDescription(type) {
  return __getDescription(LOGICAL_SEGMENT_SPECIAL_TYPE_FORMAT_DESCRIPTIONS, type);
}


function getLogicalSegmentElectronicKeyFormat(path, offset) {
  return path.readUInt8(offset + 1);
}

function getLogicalSegmentElectronicKeyFormat4(path, offset) {
  offset += 2;
  let key = {};
  key.vendorId = path.readUInt16LE(offset); offset += 2;
  key.deviceType = path.readUInt16LE(offset); offset += 2;
  key.productCode = path.readUInt16LE(offset); offset += 2;
  key.majorRevision = path.readUInt8(offset); offset += 1;
  key.minorRevision = path.readUInt8(offset);
  return key;
}







function getNetworkSegmentSubtype(path, offset) {
  const NETWORK_SUBTYPE_MASK = 0x1F;
  return path[offset] & NETWORK_SUBTYPE_MASK;
}
function getNetworkSegmentSubtypeDescription(subtype) {
  return __getDescription(NETWORK_SEGMENT_SUBTYPE_DESCRIPTIONS, subtype);
}

function getNetworkSegmentProductionInhibitTimeInMilliseconds(path, offset) {
  return path.readUInt8(offset + 1);
}

function getNetworkSegmentProductionInhibitTimeInMicroseconds(path, offset) {
  return path.readUInt32LE(offset + 2);
}




function getSymbolicSegmentFormat(path, offset) {
  const SYMBOLIC_FORMAT_MASK = 0x1F;
  if (path[offset] & SYMBOLIC_FORMAT_MASK === 0x00) {
    return kSYMBOLIC_SEGMENT_FORMAT.EXTENDED_STRING;
  }
  return kSYMBOLIC_SEGMENT_FORMAT.ASCII;
}
function getSymbolicSegmentFormatDescription(format) {
  return __getDescription(kSYMBOLIC_SEGMENT_FORMAT_DESCRIPTIONS, format);
}


function getSymbolicSegmentASCIIFormatLength(path, offset) {
  const ASCII_FORMAT_LENGTH_MASK = 0x1F;
  return path.readUInt8(offset) & ASCII_FORMAT_LENGTH_MASK;
}


function getSymbolicSegmentNumericType(path, offset) {
  const EXTENDED_FORMAT_NUMERIC_TYPE_MASK = 0x1F;
  return path.readUInt8(offset + 1) & EXTENDED_FORMAT_NUMERIC_TYPE_MASK;
}
function getSymbolicSegmentNumericTypeDescription(type) {
  return __getDescription(SYMBOLIC_SEGMENT_EXTENDED_FORMAT_NUMERIC_DESCRIPTIONS, type);
}


function getSymbolicSegmentExtendedFormat(path, offset) {
  const SYMBOLIC_SEGMENT_EXTENDED_FORMAT_MASK = 0xE0;
  return path.readUInt8(offset + 1) & SYMBOLIC_SEGMENT_EXTENDED_FORMAT_MASK;
}
function getSymbolicSegmentExtendedFormatDescription(format) {
  return __getDescription(SYMBOLIC_SEGMENT_EXTENDED_FORMAT_DESCRIPTIONS, format);
}





function getDataSegmentSubType(path, offset) {
  return path.readUInt8(offset) & 0x1F;
}
function getDataSegmentSubTypeDescription(subtype) {
  return __getDescription(DATA_SEGMENT_SUBTYPE_DESCRIPTIONS, subtype);
}


function getDataSegmentSimpleDataWordLength(path, offset) {
  return path.readUInt8(offset + 1);
}



function Decode(buffer, offset, padded) {
  if (!offset) offset = 0;
  let segments = [];
  let length = buffer.length;

  while (offset < length) {
    const segment = {};
    const segmentType = getSegmentType(buffer, offset);
    segment.type = segmentType;

    switch (segmentType) {
      case SEGMENT_TYPE.PORT:
        offset = DecodePortSegment(buffer, offset, segment);
        break;
      case SEGMENT_TYPE.LOGICAL:
        offset = DecodeLogicalSegment(buffer, offset, segment);
        break;
      case SEGMENT_TYPE.NETWORK:
        offset = readNetworkSegment(buffer, offset, segment);
        break;
      case SEGMENT_TYPE.SYMBOLIC:
        offset = readSymbolicSegment(buffer, offset, segment);
        break;
      case SEGMENT_TYPE.DATA:
        offset = readDataSegment(buffer, offset, segment);
        break;
      case SEGMENT_TYPE.DATA_TYPE_CONSTRUCTED:
        offset = readDataTypeConstructedSegment(buffer, offset, segment);
        break;
      case SEGMENT_TYPE.DATA_TYPE_ELEMENTARY:
        offset = readDataTypeElementarySegment(buffer, offset, segment);
        break;
      default:
        console.log('DEFAULT: ' + segmentType);
        return segments;
    }
    segments.push(segment);
  }
  return segments;
}


function DecodePortSegment(buffer, offset, segment, padded) {
  let length;
  const extendedLinkAddress = getPortSegmentExtendedLinkAddressSizeBit(buffer, offset);
  const port = getPortSegmentPortIdentifier(buffer, offset);

  if (extendedLinkAddress === false && port < 15) {
    segment.port = port;
    segment.linkAddress = buffer.slice(offset + 1, offset + 2);
    length = 2;
  } else if (extendedLinkAddress === true && port < 15) {
    segment.port = port;
    const linkAddressSize = getPortSegmentLinkAddressSize(buffer, offset);
    segment.linkAddress = Buffer.from(buffer.slice(offset + 2, offset + 2 + linkAddressSize));
    length = 2 + linkAddressSize;
  } else if (extendedLinkAddress === false && port === 15) {
    segment.port = getPortSegmentExtendedPortNumber(buffer, offset);
    segment.linkAddress = Buffer.from(buffer.slice(offset + 3, offset + 4));
    length = 4;
  } else if (extendedLinkAddress === true && port === 15) {
    const linkAddressSize = getPortSegmentLinkAddressSize(buffer, offset);
    segment.port = getPortSegmentExtendedPortNumber(buffer, offset);
    segment.linkAddress = Buffer.from(buffer.slice(offset + 4, offset + 4 + linkAddressSize));
    length = 4 + linkAddressSize;
  }

  return offset + (length % 2 === 0 ? length : length + 1);
}


function DecodeLogicalSegment(buffer, offset, segment) {
  const segmentByte = buffer.readUInt8(offset); offset += 1;
  const type = getBits(segmentByte, 2, 5) << 2;
  const format = getBits(segmentByte, 0, 2);

  segment.info = {
    type,
    typeDescription: LOGICAL_SEGMENT_TYPE_DESCRIPTIONS[type],
    format,
    formatDescription: LOGICAL_SEGMENT_FORMAT_DESCRIPTIONS[format]
  };

  let shift;
  switch (format) {
    case 0:
      segment.info.value = buffer.readUInt8(offset);
      shift = 2;
      break;
    case 1:
      segment.info.value = buffer.readUInt16LE(offset + 1);
      shift = 4;
      break;
    case 2:
      segment.info.value = buffer.readUInt32LE(offset + 1);
      shift = 6;
      break;
    default:
      break;
  }

  return shift;
}


function readNetworkSegment(buffer, offset, segment) {
  let length;
}


function readSymbolicSegment(buffer, offset, segment) {
  let length;
}



function readDataSegment(buffer, offset, segment) {
  let length;
}


function readDataTypeConstructedSegment(buffer, offset, segment) {
  let length;
}


function readDataTypeElementarySegment(buffer, offset, segment) {
  let length;
}


function describeSegments(segments) {
  let description = '';
  for (let i = 0; i < segments.length; i++) {
    let segment = segments[i];
    switch (segment.type) {
      case SEGMENT_TYPE.PORT:
        description += describePortSegment(segment);
        break;
      case SEGMENT_TYPE.LOGICAL:
        break;
      case SEGMENT_TYPE.NETWORK:
        break;
      case SEGMENT_TYPE.SYMBOLIC:
        break;
      case SEGMENT_TYPE.DATA:
        break;
      case SEGMENT_TYPE.DATA_TYPE_CONSTRUCTED:
        break;
      case SEGMENT_TYPE.DATA_TYPE_ELEMENTARY:
        break;
      default:
      //
    }
  }
  return description;
}

const validASCIICharacterSet = /[a-zA-Z0-9\.\@]/;

function describePortSegment(segment) {
  let description = 'Segment Type = Port Segment, ';
  description += 'Port Number = ' + segment.port + ', ';
  description += 'Link Address = ';

  let linkAddress = segment.linkAddress;
  let linkAddressLength = linkAddress.length;

  let validASCII = true;

  for (let i = 0; i < linkAddressLength; i++) {
    if (!validASCIICharacterSet.exec(String.fromCharCode(linkAddress[i]))) {
      validASCII = false;
      break;
    }
  }

  if (validASCII) {
    for (let i = 0; i < linkAddressLength; i++) {
      description += String.fromCharCode(linkAddress[i]);
    }
  } else {
    for (let i = 0; i < linkAddressLength - 1; i++) {
      description += linkAddress[i] + ', ';
    }
    description += linkAddress[linkAddressLength - 1];
  }

  return description;
}




function LogicalClassSegment(classID) {
  return {
    type: SEGMENT_TYPE.LOGICAL,
    info: {
      type: LOGICAL_SEGMENT_TYPE.CLASS_ID,
      value: classID
    }
  }
}


// const Segments = {
//   Logical: {
//     Class: function(classID) {
//       return {
//         type: SEGMENT_TYPE.LOGICAL,
//         info: {
//           type: LOGICAL_SEGMENT_TYPE.CLASS_ID,
//           value: classID
//         }
//       }
//     },
//     Instance: function(instanceID) {
//       return {
//         type: SEGMENT_TYPE.LOGICAL,
//         info: {
//           type: LOGICAL_SEGMENT_TYPE.INSTANCE_ID,
//           value: instanceID
//         }
//       }
//     }
//   }
// };



class EPath {



  /**
   * CIP Vol 1 Appendix C-1.4.5.2
   * 
   * tagname
   * tagname.member
   * tagname[element]
   * tagname[element].member
   * tagname[idx1,idx2]
   */
  static EncodeANSIExtSymbol(symbol) {
    let offset = 0;
    const buffer = Buffer.allocUnsafe(512);

    const items = symbol.split('.');

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const items2 = item.split('[');

      const tagname = items2[0];
      const tagnameLength = tagname.length;

      offset = buffer.writeUInt8(DATA_SEGMENT_SUBTYPE.ANSI_EXTENDED_SYMBOL, offset);
      offset = buffer.writeUInt8(tagnameLength, offset);

      offset += buffer.write(tagname, offset, 'ascii');

      // offset += tagnameLength % 2 === 1 ? 1 : 0;
      if (tagnameLength % 2 === 1) {
        /** THIS MUST STAY IF USING Buffer.allocUnsafe() */
        offset = buffer.writeUInt8(0, offset);
      }

      if (items2.length > 1) {
        const elementsArrayStr = items2[1];
        const elementsArray = elementsArrayStr.substring(0, elementsArrayStr.length - 1);
        const elements = elementsArray.split(',');

        for (let j = 0; j < elements.length; j++) {
          const element = parseInt(elements[j], 10);

          if (!isNaN(element) || element >= 0 || element <= 0xFFFFFFFF) {
            if (element <= 0xFF) {
              offset = buffer.writeUInt8(0x28, offset);
              offset = buffer.writeUInt8(element, offset);
            } else if (element <= 0xFFFF) {
              offset = buffer.writeUInt16LE(0x29, offset);
              offset = buffer.writeUInt16LE(element, offset);
            } else {
              offset = buffer.writeUInt16LE(0x30, offset);
              offset = buffer.writeUInt32LE(element, offset);
            }
          } else {
            throw new Error(`Element is not an integer between 0 and 4294967295: ${symbol}`);
          }
        }
      }
    }

    return buffer.slice(0, offset);
  }


  static Encode(classID, instanceID, attributeID) {
    const segments = [];
    let code, length, totalLength = 0;

    if (classID != null) {
      if (classID < 256) {
        length = 1;
        code = 0x20;
      } else {
        length = 2;
        code = 0x21;
      }
      totalLength += (length + 1) + (length + 1) % 2; /** include pad byte if segment has an odd length */
      segments.push({
        type: 'CLASS',
        value: classID,
        code,
        length
      });
    }

    if (instanceID != null) {
      if (instanceID < 256) {
        length = 1;
        code = 0x24;
      } else {
        length = 2;
        code = 0x25;
      }
      totalLength += (length + 1) + (length + 1) % 2; /** include pad byte if segment has an odd length */
      segments.push({
        type: 'INSTANCE',
        value: instanceID,
        code,
        length
      });
    }

    if (attributeID != null) {
      if (attributeID < 256) {
        length = 1;
        code = 0x30;
      } else {
        length = 2;
        code = 0x31;
      }
      totalLength += (length + 1) + (length + 1) % 2; /** include pad byte if segment has an odd length */
      segments.push({
        type: 'ATTRIBUTE',
        value: attributeID,
        code,
        length
      });
    }

    const buffer = Buffer.allocUnsafe(totalLength);
    let offset = 0;
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      switch (segment.length) {
        case 1:
          offset = buffer.writeUInt8(segment.code, offset);
          offset = buffer.writeUInt8(segment.value, offset);
          break;
        case 2:
          offset = buffer.writeUInt16LE(segment.code, offset);
          offset = buffer.writeUInt16LE(segment.value, offset);
          break;
        default:
          throw new Error(`Unexpected segment length ${segment.length}`);
      }
    }

    return buffer;
  }

  static Decode(buffer, offset, length, padded, cb) {
    const startingOffset = offset;
    const segments = [];
    while (offset - startingOffset < length) {
      const segmentCode = buffer.readUInt8(offset); offset += 1;
      const segmentType = getBits(segmentCode, 5, 8);
      
      switch (segmentType) {
        case 0:
          offset = Segments.Port.Decode(segmentCode, buffer, offset, padded, val => segments.push(val));
          break;
        case 1:
          offset = Segments.Logical.Decode(segmentCode, buffer, offset, padded, val => segments.push(val));
          break;
        case 2:
          offset = Segments.Network.Decode(segmentCode, buffer, offset, padded, val => segments.push(val));
          break;
        case 3:
          offset = Segments.Symbolic.Decode(segmentCode, buffer, offset, padded, val => segments.push(val));
          break;
        case 4:
          offset = Segments.Data.Decode(segmentCode, buffer, offset, padded, val => segments.push(val));
          break;
        default:
          throw new Error(`Unexpected segment: ${segmentType}`);
      }
    }

    if (typeof cb === 'function') {
      cb(segments);
    }

    return offset;
    
    // return Decode(buffer, offset, padded, cb);
  }

  static DescribeSegments(segments) {
    return describeSegments(segments);
  }
}



module.exports = EPath;
