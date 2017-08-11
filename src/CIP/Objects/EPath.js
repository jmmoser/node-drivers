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

const SEGMENT_TYPE_DESCRIPTIONS = {
  SEGMENT_TYPE.PORT: 'Port',
  SEGMENT_TYPE.LOGICAL: 'Logical',
  SEGMENT_TYPE.NETWORK: 'Network',
  SEGMENT_TYPE.SYMBOLIC: 'Symbolic',
  SEGMENT_TYPE.DATA: 'Data',
  SEGMENT_TYPE.DATA_TYPE_CONSTRUCTED: 'Data type constructed',
  SEGMENT_TYPE.DATA_TYPE_ELEMENTARY: 'Data type elementary',
  SEGMENT_TYPE.RESERVED: 'Reserved'
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
  LOGICAL_SEGMENT_TYPE.CLASS_ID: 'Class Id',
  LOGICAL_SEGMENT_TYPE.INSTANCE_ID: 'Instance Id',
  LOGICAL_SEGMENT_TYPE.MEMBER_ID: 'Member Id',
  LOGICAL_SEGMENT_TYPE.CONNECTION_POINT: 'Connection point',
  LOGICAL_SEGMENT_TYPE.ATTRIBUTE_ID: 'Attribute Id',
  LOGICAL_SEGMENT_TYPE.SPECIAL: 'Special',
  LOGICAL_SEGMENT_TYPE.SERVICE_ID: 'Service Id',
  LOGICAL_SEGMENT_TYPE.EXTENDED_LOGICAL: 'Extended logical'
}

const LOGICAL_SEGMENT_FORMAT = {
  EIGHT_BIT: 0x00,
  SIXTEEN_BIT: 0x01,
  THIRTY_TWO_BIT: 0x02
};
const LOGICAL_SEGMENT_FORMAT_DESCRIPTIONS = {
  LOGICAL_SEGMENT_FORMAT.EIGHT_BIT: 'Eight bit',
  LOGICAL_SEGMENT_FORMAT.SIXTEEN_BIT: 'Sixteen bit',
  LOGICAL_SEGMENT_FORMAT.THIRTY_TWO_BIT: 'Thirty two bit'
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
  LOGICAL_SEGMENT_EXTENDED_TYPE.RESERVED: 'Reserved',
  LOGICAL_SEGMENT_EXTENDED_TYPE.ARRAY_INDEX: 'Array index',
  LOGICAL_SEGMENT_EXTENDED_TYPE.INDIRECT_ARRAY_INDEX: 'Indirect array index',
  LOGICAL_SEGMENT_EXTENDED_TYPE.BIT_INDEX: 'Bit index',
  LOGICAL_SEGMENT_EXTENDED_TYPE.INDIRECT_BIT_INDEX: 'Indirect bit index',
  LOGICAL_SEGMENT_EXTENDED_TYPE.STRUCTURE_MEMBER_NUMBER: 'Structure member number',
  LOGICAL_SEGMENT_EXTENDED_TYPE.STRUCTURE_MEMBER_HANDLE: 'Structure member handle'
};


const LOGICAL_SEGMENT_SPECIAL_TYPE_FORMAT = {
  ELECTRONIC_KEY: 0x00
};
const LOGICAL_SEGMENT_SPECIAL_TYPE_FORMAT_DESCRIPTIONS = {
  LOGICAL_SEGMENT_SPECIAL_TYPE_FORMAT.ELECTRONIC_KEY: 'Electronic key'
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
  NETWORK_SEGMENT_SUBTYPE.SCHEDULE: 'Schedule',
  NETWORK_SEGMENT_SUBTYPE.FIXED_TAG: 'Fixed tag',
  NETWORK_SEGMENT_SUBTYPE.PRODUCTION_INHIBIT_TIME_IN_MILLISECONDS: 'Production inhibit time in milliseconds',
  NETWORK_SEGMENT_SUBTYPE.SAFETY: 'Safety',
  NETWORK_SEGMENT_SUBTYPE.PRODUCTION_INHIBIT_TIME_IN_MICROSECONDS: 'Production inhibit time in microseconds',
  NETWORK_SEGMENT_SUBTYPE.EXTENDED_NETWORK: 'Extended network'
};



// CIP Vol1 Appendix C-1.4.4
const SYMBOLIC_SEGMENT_EXTENDED_FORMAT = {
  DOUBLE_BYTE_CHARS: 0x20,
  TRIPLE_BYTE_CHARS: 0x40,
  NUMERIC: 0xC0
};

const SYMBOLIC_SEGMENT_EXTENDED_FORMAT_NUMERIC = {
  USINT: 0x06,
  UINT: 0x07,
  UDINT: 0x08
};

const SYMBOLIC_SEGMENT_EXTENDED_FORMAT_DESCRIPTIONS = {
  SYMBOLIC_SEGMENT_EXTENDED_FORMAT.DOUBLE_BYTE_CHARS: 'Double-byte characters',
  SYMBOLIC_SEGMENT_EXTENDED_FORMAT.TRIPLE_BYTE_CHARS: 'Triple-byte characters'
  SYMBOLIC_SEGMENT_EXTENDED_FORMAT.NUMERIC: 'Numeric'
};

const SYMBOLIC_SEGMENT_EXTENDED_FORMAT_NUMERIC_DESCRIPTIONS = {
  SYMBOLIC_SEGMENT_EXTENDED_FORMAT_NUMERIC.USINT: 'USINT',
  SYMBOLIC_SEGMENT_EXTENDED_FORMAT_NUMERIC.UINT: 'UINT',
  SYMBOLIC_SEGMENT_EXTENDED_FORMAT_NUMERIC: 'UDINT'
};

const kSYMBOLIC_SEGMENT_FORMAT = {
  ASCII: 1,
  EXTENDED_STRING: 2
};
const kSYMBOLIC_SEGMENT_FORMAT_DESCRIPTIONS = {
  SYMBOLIC_SEGMENT_FORMAT.ASCII: 'ASCII',
  SYMBOLIC_SEGMENT_FORMAT.EXTENDED_STRING: 'Extended string'
};



// CIP Vol1 Appendix C-1.4.5
const DATA_SEGMENT_SUBTYPE = {
  SIMPLE_DATA: 0x00,
  ANSI_EXTENDED_SYMBOL: 0x11
};
const DATA_SEGMENT_SUBTYPE_DESCRIPTIONS = {
  DATA_SEGMENT_SUBTYPE.SIMPLE_DATA: 'Simple data',
  DATA_SEGMENT_SUBTYPE.ANSI_EXTENDED_SYMBOL: 'ANSI extended symbol'
};



// const __SYMBOLIC_SEGMENT_FORMAT = {
//   EXTENDED_STRING: 0x00
// };





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
  return path[offset] & SEGMENT_TYPE_MASK;
}

function setSegmentType(path, offset, type) {
  path[offset] |= type;
}

function getSegmentTypeDescription(segmentType) {
  return __getDescription(SEGMENT_TYPE_DESCRIPTIONS, segmentType);
}


function getPortSegmentExtendedLinkAddressSizeBit(path, offset) {
  const EXTENDED_LINK_ADDRESS_SIZE_MASK = 0x10;
  return EXTENDED_LINK_ADDRESS_SIZE_MASK === (path[offset] & EXTENDED_LINK_ADDRESS_SIZE_MASK);
}

function getPortSegmentPortIdentifier(path, offset) {
  const PORT_IDENTIFIER_MASK = 0x0F;
  // __ASSERT(getPathPortSegmentPortIdentifier(path, offset) === SEGMENT_TYPE.PORT, 'Segment type is not Port');
  // __ASSER(path[offset] & PORT_IDENTIFIER_MASK === 0, 'Port cannot be 0');
  return path[offset] & PORT_IDENTIFIER_MASK;
}

function setPortSegmentPortIdentifier(path, offset, identifier) {
  path[offset] |= identifier;
}



function getPortSegmentLinkAddressSize(path, offset) {
  return path[offset + 1];
}

function getPortSegmentExtendedPortNumber(path, offset) {
  // __ASSERT(getPathPortSegmentPortIdentifier(path, offset) === SEGMENT_TYPE.PORT, 'Segment type is not Port');
  let position = getPathPortSegmentExtendedLinkAddressSizeBit(path, offset) === true ? 2 : 1;
  // return path[offset + position] + (path[offset + possition + 1] << 8);
  return path.readUInt16LE(offset + position);
}

function setPortSegmentExtendedPortIdentifier(path, offset, identifier) {
  setPathPortSegmentPortIdentifier(path, offset, identifier);
  let position = getPathPortSegmentExtendedLinkAddressSizeBit(path, offset) === true ? 2 : 1;
  // path[offset + position] = identifier & 0x00FF;
  // path[offset + position + 1] = identifier & 0xFF00 >> 8;
  path.writeUInt16LE(offset + position, identifier);
}




function getLogicalSegmentLogicalType(path, offset) {
  const LOGICAL_TYPE_MASK = 0x1C;
  return path[offset] & LOGICAL_TYPE_MASK;
}
function getLogicalSegmentLogicalTypeDescription(type) {
  return __getDescription(LOGICAL_SEGMENT_TYPE_DESCRIPTIONS, type);
}


function getLogicalSegmentLogicalFormat(path, offset) {
  const LOGICAL_FORMAT_MASK = 0x03;
  return path[offset] & LOGICAL_FORMAT_MASK;
}
function getLogicalSegmentLogicalFormatDescription(format) {
  return __getDescription(LOGICAL_SEGMENT_FORMAT_DESCRIPTIONS, format);
}


function getLogicalSegmentExtendedLogicalType(path, offset) {
  return path[offset + 1];
}
function getLogicalSegmentExtendedLogicalTypeDescription(type) {
  return __getDescription(LOGICAL_SEGMENT_EXTENDED_TYPE_DESCRIPTIONS, type);
}


function getLogicalSegmentSpecialTypeLogicalType(path, offset) {
  const LOGICAL_FORMAT_MASK = 0x03;
  return path[offset] & LOGICAL_FORMAT_MASK;
}
function getLogicalSegmentSpecialTypeLogicalTypeDescription(type) {
  return __getDescription(LOGICAL_SEGMENT_SPECIAL_TYPE_FORMAT_DESCRIPTIONS, type);
}


function getLogicalSegmentElectronicKeyFormat(path, offset) {
  return path[offset + 1];
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
  // if (path[offset] & SYMBOLIC_FORMAT_MASK === __SYMBOLIC_SEGMENT_FORMAT.EXTENDED_STRING) {
  if (path[offset] & SYMBOLIC_FORMAT_MASK === 0x00) {
    return kSYMBOLIC_SEGMENT_FORMAT.EXTENDED_STRING;
  }
  return kSYMBOLIC_SEGMENT_FORMAT.ASCII;
}
function getSymbolicSegmentFormatDescription(format) {
  return __getDescription(kSYMBOLIC_SEGMENT_FORMAT_DESCRIPTIONS, format);
  // return kSYMBOLIC_SEGMENT_FORMAT_DESCRIPTIONS[format];
}


function getSymbolicSegmentASCIIFormatLength(path, offset) {
  const ASCII_FORMAT_LENGTH_MASK = 0x1F;
  return path[offset] & ASCII_FORMAT_LENGTH_MASK;
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
