'use strict';

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
  0x00: 'Port',
  0x20: 'Logical',
  0x40: 'Network',
  0x60: 'Symbolic',
  0x80: 'Data',
  0xA0: 'Data type constructed',
  0xC0: 'Data type elementary',
  0xE0: 'Reserved'
};

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
// const mSEGMENT_TYPE = {
//   kSEGMENT_TYPE.PORT: SEGMENT_TYPE.PORT,
//   kSEGMENT_TYPE.LOGICAL: SEGMENT_TYPE.LOGICAL,
//   kSEGMENT_TYPE.SYMBOLIC: SEGMENT_TYPE.SYMBOLIC,
//   kSEGMENT_TYPE.DATA: SEGMENT_TYPE.DATA,
//   kSEGMENT_TYPE.DATA_TYPE_CONSTRUCTED: SEGMENT_TYPE.DATA_TYPE_CONSTRUCTED,
//   kSEGMENT_TYPE.DATA_TYPE_ELEMENTARY: SEGMENT_TYPE.DATA_TYPE_ELEMENTARY,
//   kSEGMENT_TYPE.RESERVED: RESERVED
// }





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
  0x00: 'Class Id',
  0x04: 'Instance Id',
  0x08: 'Member Id',
  0x0C: 'Connection point',
  0x10: 'Attribute Id',
  0x14: 'Special',
  0x18: 'Service Id',
  0x1C: 'Extended logical'
}

const LOGICAL_SEGMENT_FORMAT = {
  EIGHT_BIT: 0x00,
  SIXTEEN_BIT: 0x01,
  THIRTY_TWO_BIT: 0x02
};
const LOGICAL_SEGMENT_FORMAT_DESCRIPTIONS = {
  0x00: 'Eight bit',
  0x01: 'Sixteen bit',
  0x02: 'Thirty two bit'
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
  0x00: 'Reserved',
  0x01: 'Array index',
  0x02: 'Indirect array index',
  0x03: 'Bit index',
  0x04: 'Indirect bit index',
  0x05: 'Structure member number',
  0x06: 'Structure member handle'
};


const LOGICAL_SEGMENT_SPECIAL_TYPE_FORMAT = {
  ELECTRONIC_KEY: 0x00
};
const LOGICAL_SEGMENT_SPECIAL_TYPE_FORMAT_DESCRIPTIONS = {
  0x00: 'Electronic key'
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
  0x01: 'Schedule',
  0x02: 'Fixed tag',
  0x03: 'Production inhibit time in milliseconds',
  0x04: 'Safety',
  0x10: 'Production inhibit time in microseconds',
  0x1F: 'Extended network'
};



// CIP Vol1 Appendix C-1.4.4
const SYMBOLIC_SEGMENT_EXTENDED_FORMAT = {
  DOUBLE_BYTE_CHARS: 0x20,
  TRIPLE_BYTE_CHARS: 0x40,
  NUMERIC: 0xC0
};
const SYMBOLIC_SEGMENT_EXTENDED_FORMAT_DESCRIPTIONS = {
  0x20: 'Double-byte characters',
  0x40: 'Triple-byte characters',
  0xC0: 'Numeric'
};

const SYMBOLIC_SEGMENT_EXTENDED_FORMAT_NUMERIC = {
  USINT: 0x06,
  UINT: 0x07,
  UDINT: 0x08
};
const SYMBOLIC_SEGMENT_EXTENDED_FORMAT_NUMERIC_DESCRIPTIONS = {
  0x06: 'USINT',
  0x07: 'UINT',
  0x08: 'UDINT'
};

const kSYMBOLIC_SEGMENT_FORMAT = {
  ASCII: 1,
  EXTENDED_STRING: 2
};
const kSYMBOLIC_SEGMENT_FORMAT_DESCRIPTIONS = {
  1: 'ASCII',
  2: 'Extended string'
};



// CIP Vol1 Appendix C-1.4.5
const DATA_SEGMENT_SUBTYPE = {
  SIMPLE_DATA: 0x00,
  ANSI_EXTENDED_SYMBOL: 0x11
};
const DATA_SEGMENT_SUBTYPE_DESCRIPTIONS = {
  0x00: 'Simple data',
  0x11: 'ANSI extended symbol'
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







function __ASSERT(expression, errorDescription) {
  if (!expression) {
    throw new Error(errorDescription);
  }
}


function __getDescription(descriptions, code, unknown) {
  let description = descriptions[code];
  if (!description) description = unknown || 'Unknown';
  return unknown;
}


function getSegmentType(path, offset) {
  const SEGMENT_TYPE_MASK = 0xE0;
  return path.readUInt8(offset) & SEGMENT_TYPE_MASK;
}

function setSegmentType(path, offset, type) {
  path[offset] |= type;
}

function getSegmentTypeDescription(segmentType) {
  return __getDescription(SEGMENT_TYPE_DESCRIPTIONS, segmentType);
}



function getPortSegmentExtendedLinkAddressSizeBit(path, offset) {
  const EXTENDED_LINK_ADDRESS_SIZE_MASK = 0x10;
  return EXTENDED_LINK_ADDRESS_SIZE_MASK === (path.readUInt8(offset) & EXTENDED_LINK_ADDRESS_SIZE_MASK);
}

function getPortSegmentPortIdentifier(path, offset) {
  const PORT_IDENTIFIER_MASK = 0x0F;
  // __ASSERT(getPathPortSegmentPortIdentifier(path, offset) === SEGMENT_TYPE.PORT, 'Segment type is not Port');
  // __ASSER(path[offset] & PORT_IDENTIFIER_MASK === 0, 'Port cannot be 0');
  return path.readUInt8(offset) & PORT_IDENTIFIER_MASK;
}

function setPortSegmentPortIdentifier(path, offset, identifier) {
  path.writeUInt8(path.readUInt8(offset) | identifier, offset);
  // path[offset] |= identifier;
}


function getPortSegmentLinkAddressSize(path, offset) {
  return path.readUInt8(offset + 1);
}

function getPortSegmentExtendedPortNumber(path, offset) {
  // __ASSERT(getPathPortSegmentPortIdentifier(path, offset) === SEGMENT_TYPE.PORT, 'Segment type is not Port');
  let position = getPortSegmentExtendedLinkAddressSizeBit(path, offset) === true ? 2 : 1;
  // return path[offset + position] + (path[offset + possition + 1] << 8);
  return path.readUInt16LE(offset + position);
}

function setPortSegmentExtendedPortIdentifier(path, offset, identifier) {
  setPathPortSegmentPortIdentifier(path, offset, identifier);
  let position = getPortSegmentExtendedLinkAddressSizeBit(path, offset) === true ? 2 : 1;
  // path[offset + position] = identifier & 0x00FF;
  // path[offset + position + 1] = identifier & 0xFF00 >> 8;
  path.writeUInt16LE(offset + position, identifier);
}




function getLogicalSegmentLogicalType(path, offset) {
  const LOGICAL_TYPE_MASK = 0x1C;
  return path.readUInt8(offset) & LOGICAL_TYPE_MASK;
}
function getLogicalSegmentLogicalTypeDescription(type) {
  return __getDescription(LOGICAL_SEGMENT_TYPE_DESCRIPTIONS, type);
}


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




function parsePath(path, offset) {
  if (!offset) offset = 0;
  let shift;
  let segments = [];
  let length = path.length;

  while (offset < length) {
    let segment = {};
    let segmentType = getSegmentType(path, offset);

    switch (segmentType) {
      case SEGMENT_TYPE.PORT:
        shift = readPortSegment(path, offset, segment);
        break;
      case SEGMENT_TYPE.LOGICAL:
        shift = readLogicalSegment(path, offset, segment);
        break;
      case SEGMENT_TYPE.NETWORK:
        shift = readNetworkSegment(path, offset, segment);
        break;
      case SEGMENT_TYPE.SYMBOLIC:
        shift = readSymbolicSegment(path, offset, segment);
        break;
      case SEGMENT_TYPE.DATA:
        shift = readDataSegment(path, offset, segment);
        break;
      case SEGMENT_TYPE.DATA_TYPE_CONSTRUCTED:
        shift = readDataTypeConstructedSegment(path, offset, segment);
        break;
      case SEGMENT_TYPE.DATA_TYPE_ELEMENTARY:
        shift = readDataTypeElementarySegment(path, offset, segment);
        break;
      default:
        return segments;
    }
    segments.push(segment);
    offset += shift;
  }
  return segments;
}


function readPortSegment(path, offset, segment) {
  let length;
  segment.segmentType = SEGMENT_TYPE.PORT;
  let linkAddressSize = 1;
  let extendedLinkAddress = getPortSegmentExtendedLinkAddressSizeBit(path, offset);
  let port = getPortSegmentPortIdentifier(path, offset);

  if (extendedLinkAddress === false && port < 15) {
    segment.port = port;
    segment.linkAddress = Buffer.from(path.slice(offset + 1, offset + 2));
    length = 2;
  } else if (extendedLinkAddress === true && port < 15) {
    segment.port = port;
    let linkAddressSize = getPortSegmentLinkAddressSize(path, offset);
    segment.linkAddress = Buffer.from(path.slice(offset + 2, offset + 2 + linkAddressSize));
    length = 2 + linkAddressSize;
  } else if (extendedLinkAddress === false && port === 15) {
    segment.port = getPortSegmentExtendedPortNumber(path, offset);
    segment.linkAddress = Buffer.from(path.slice(offset + 3, offset + 4));
    length = 4;
  } else if (extendedLinkAddress === true && port === 15) {
    let linkAddressSize = getPortSegmentLinkAddressSize(path, offset);
    segment.port = getPortSegmentExtendedPortNumber(path, offset);
    segment.linkAddress = Buffer.from(path.slice(offset + 4, offset + 4 + linkAddressSize));
    length = 4 + linkAddressSize;
  }

  return length % 2 === 0 ? length : length + 1;
}

// function readPortSegment(path, offset, segment) {
//   let length;
//   segment.segmentType = SEGMENT_TYPE.PORT;
//   let extendedLinkAddress = getPortSegmentExtendedLinkAddressSizeBit(path, offset);
//   let port = getPortSegmentPortIdentifier(path, offset);
//
//   if (extendedLinkAddress === false && port < 15) {
//     segment.port = port;
//     segment.linkAddress = Buffer.from(path.slice(offset + 1, offset + 2));
//     length = 2;
//   } else if (extendedLinkAddress === true && port < 15) {
//     segment.port = port;
//     let linkAddressSize = path.readUInt8(offset + 1);
//     segment.linkAddress = Buffer.from(path.slice(offset + 2, offset + 2 + linkAddressSize));
//     length = 2 + linkAddressSize;
//   } else if (extendedLinkAddress === false && port === 15) {
//     segment.port = path.readUInt16LE(offset + 1);
//     segment.linkAddress = Buffer.from(path.slice(offset + 3, offset + 4));
//     length = 4;
//   } else if (extendedLinkAddress === true && port === 15) {
//     let linkAddressSize = path.readUInt8(offset + 1);
//     segment.port = path.readUInt16LE(offset + 2);
//     segment.linkAddress = Buffer.from(path.slice(offset + 4, offset + 4 + linkAddressSize));
//     length = 4 + linkAddressSize;
//   }
//
//   return length % 2 === 0 ? length : length + 1;
// }

function readLogicalSegment(path, offset, segment) {
  let length;
  segment.segmentType = SEGMENT_TYPE.LOGICAL;
}

function readNetworkSegment(path, offset, segment) {
  let length;
  segment.segmentType = SEGMENT_TYPE.NETWORK;
}

function readSymbolicSegment(path, offset, segment) {
  let length;
  segment.segmentType = SEGMENT_TYPE.SYMBOLIC;
}

function readDataSegment(path, offset, segment) {
  let length;
  segment.segmentType = SEGMENT_TYPE.DATA;
}

function readDataTypeConstructedSegment(path, offset, segment) {
  let length;
  segment.segmentType = SEGMENT_TYPE.DATA_TYPE_CONSTRUCTED;
}

function readDataTypeElementarySegment(path, offset, segment) {
  let length;
  segment.segmentType = SEGMENT_TYPE.DATA_TYPE_ELEMENTARY;
}

function describeSegments(segments) {
  let description = '';
  for (let i = 0; i < segments.length; i++) {
    let segment = segments[i];
    switch (segment.segmentType) {
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

module.exports = {
  parsePath,
  describeSegments
};
