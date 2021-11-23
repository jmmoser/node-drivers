import { getBits } from '../../../utils';

import { Ref } from '../../../types';

/** CIP Vol1 Table C-6.1 */
export enum DataTypeCodes {
  /** DATATYPES FROM EXTERNAL SOURCES CANNOT BE NEGATIVE BECAUSE CODE IS READ AS UNSIGNED */
  TRANSFORM = -3,
  PLACEHOLDER = -2, /** used when previously decoded data determines datatype */
  UNKNOWN = -1,

  BOOL = 0xC1,
  SINT = 0xC2,
  INT = 0xC3,
  DINT = 0xC4,
  LINT = 0xC5,
  USINT = 0xC6,
  UINT = 0xC7,
  UDINT = 0xC8,
  ULINT = 0xC9,
  REAL = 0xCA,
  LREAL = 0xCB,
  STIME = 0xCC,
  DATE = 0xCD,
  TIME_OF_DAY = 0xCE,
  DATE_AND_TIME = 0xCF,
  STRING = 0xD0,
  BYTE = 0xD1,
  WORD = 0xD2,
  DWORD = 0xD3,
  LWORD = 0xD4,
  STRING2 = 0xD5,
  FTIME = 0xD6,
  LTIME = 0xD7,
  ITIME = 0xD8,
  STRINGN = 0xD9,
  SHORT_STRING = 0xDA,
  TIME = 0xDB,
  EPATH = 0xDC,
  ENGUNIT = 0xDD,
  STRINGI = 0xDE,

  /** CIP Volume 1, C-6.2 Constructed Data Type Reporting */

  /* Data is an abbreviated struct type, i.e. a CRC of the actual type descriptor */
  ABBREV_STRUCT = 0xA0,

  /* Data is an abbreviated array type. The limits are left off */
  ABBREV_ARRAY = 0xA1,

  /* Data is a struct type descriptor */
  STRUCT = 0xA2,

  /* Data is an array type descriptor */
  ARRAY = 0xA3,
};

/** ANS.1 */
export enum DataTypeTagClassCodes {
  Universal = 0,
  Application = 1,
  ContextSpecific = 2,
  Private = 3,
};

export enum DataTypeTagTypeCodes {
  Primitive = 0,
  Constructed = 1,
};

export function DecodeDataTypeTag(buffer: Buffer, offsetRef: Ref) {
  const code = buffer.readUInt8(offsetRef.current); offsetRef.current += 1;
  const tagClass = getBits(code, 6, 8);
  const tagType = getBits(code, 5, 6);
  let tagID = getBits(code, 0, 5);
  if (tagID === 0b11111) {
    let length = 1;
    while (getBits(buffer.readUInt8(offsetRef.current + length - 1), 7, 8) === 1) {
      length += 1;
    }
    tagID = 0;
    for (let i = 0; i < length; i++) {
      tagID |= (buffer.readUInt8(offsetRef.current + i) & 0b1111111) << (7 * (length - i - 1));
    }
  }

  return {
    tagClass: {
      code: tagClass,
      name: DataTypeTagClassCodes[tagClass] || 'Unknown',
    },
    type: {
      code: tagType,
      name: DataTypeTagTypeCodes[tagType] || 'Unknown',
    },
    id: tagID,
    code,
  };
}

export default {
  DataTypeCodes,
  // DataTypeTag,
  DecodeDataTypeTag,
};
