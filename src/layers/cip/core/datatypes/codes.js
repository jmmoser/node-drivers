'use strict';

const { getBits, InvertKeyValues } = require('../../../../utils');

/** CIP Vol1 Table C-6.1 */
const DataTypeCodes = Object.freeze({
  /** DATATYPES FROM EXTERNAL SOURCES CANNOT BE NEGATIVE BECAUSE CODE IS READ AS UNSIGNED */
  TRANSFORM: -4,
  PLACEHOLDER: -3, /** used when previously decoded data determines datatype */
  SMEMBER: -2,
  UNKNOWN: -1,

  BOOL: 0xC1,
  SINT: 0xC2,
  INT: 0xC3,
  DINT: 0xC4,
  LINT: 0xC5,
  USINT: 0xC6,
  UINT: 0xC7,
  UDINT: 0xC8,
  ULINT: 0xC9,
  REAL: 0xCA,
  LREAL: 0xCB,
  STIME: 0xCC,
  DATE: 0xCD,
  TIME_OF_DAY: 0xCE,
  DATE_AND_TIME: 0xCF,
  STRING: 0xD0,
  BYTE: 0xD1,
  WORD: 0xD2,
  DWORD: 0xD3,
  LWORD: 0xD4,
  STRING2: 0xD5,
  FTIME: 0xD6,
  LTIME: 0xD7,
  ITIME: 0xD8,
  STRINGN: 0xD9,
  SHORT_STRING: 0xDA,
  TIME: 0xDB,
  EPATH: 0xDC,
  ENGUNIT: 0xDD,
  STRINGI: 0xDE,

  /** CIP Volume 1, C-6.2 Constructed Data Type Reporting */
  ABBREV_STRUCT: 0xA0, /* Data is an abbreviated struct type, i.e. a CRC of the actual type descriptor */
  ABBREV_ARRAY: 0xA1, /* Data is an abbreviated array type. The limits are left off */
  STRUCT: 0xA2, /* Data is a struct type descriptor */
  ARRAY: 0xA3 /* Data is an array type descriptor */
});

const DataTypeNames = InvertKeyValues(DataTypeCodes);


/** ANS.1 */
const DataTypeTagClassCodes = Object.freeze({
  Universal: 0,
  Application: 1,
  ContextSpecific: 2,
  Private: 3
});

const DataTypeTagClassNames = InvertKeyValues(DataTypeTagClassCodes);


const DataTypeTagTypeCodes = Object.freeze({
  Primitive: 0,
  Constructed: 1
});

const DataTypeTagTypeNames = InvertKeyValues(DataTypeTagTypeCodes);


function DecodeDataTypeTag(buffer, offset, cb) {
  const code = buffer.readUInt8(offset); offset += 1;
  const tagClass = getBits(code, 6, 8);
  const tagType = getBits(code, 5, 6);
  let tagID = getBits(code, 0, 5);
  if (tagID === 0b11111) {
    let length = 1;
    while (getBits(buffer.readUInt8(offset + length - 1), 7, 8) === 1) {
      length += 1;
    }
    tagID = 0;
    for (let i = 0; i < length; i++) {
      tagID |= (buffer.readUInt8(offset + i) & 0b1111111) << (7 * (length - i - 1));
    }
  }
  if (typeof cb === 'function') {
    cb({
      tagClass: {
        code: tagClass,
        name: DataTypeTagClassNames[tagClass] || 'Unknown'
      },
      type: {
        code: tagType,
        name: DataTypeTagTypeNames[tagType] || 'Unknown'
      },
      id: tagID,
      code
    });
  }
  return offset;
}


module.exports = {
  DataTypeCodes,
  DataTypeNames,
  // DataTypeTag,
  DecodeDataTypeTag
};