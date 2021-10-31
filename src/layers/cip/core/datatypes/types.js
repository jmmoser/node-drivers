import { DataTypeCodes } from './codes.js';

export const DataType = Object.freeze({
  UNKNOWN(length) {
    return { type: DataType.UNKNOWN, code: DataTypeCodes.UNKNOWN, length };
  },

  /** Elementary Types */
  BOOL(position = 0) {
    return { type: DataType.BOOL, code: DataTypeCodes.BOOL, position };
  },
  SINT() {
    return { type: DataType.SINT, code: DataTypeCodes.SINT };
  },
  INT() {
    return { type: DataType.INT, code: DataTypeCodes.INT };
  },
  DINT() {
    return { type: DataType.DINT, code: DataTypeCodes.DINT };
  },
  LINT() {
    return { type: DataType.LINT, code: DataTypeCodes.LINT };
  },
  USINT() {
    return { type: DataType.USINT, code: DataTypeCodes.USINT };
  },
  UINT() {
    return { type: DataType.UINT, code: DataTypeCodes.UINT };
  },
  UDINT() {
    return { type: DataType.UDINT, code: DataTypeCodes.UDINT };
  },
  ULINT() {
    return { type: DataType.ULINT, code: DataTypeCodes.ULINT };
  },
  REAL() {
    return { type: DataType.REAL, code: DataTypeCodes.REAL };
  },
  LREAL() {
    return { type: DataType.LREAL, code: DataTypeCodes.LREAL };
  },
  STIME() {
    return { type: DataType.STIME, code: DataTypeCodes.STIME };
  },
  DATE() {
    return { type: DataType.DATE, code: DataTypeCodes.DATE };
  },
  TIME_OF_DAY() {
    return { type: DataType.TIME_OF_DAY, code: DataTypeCodes.TIME_OF_DAY };
  },
  DATE_AND_TIME() {
    return { type: DataType.DATE_AND_TIME, code: DataTypeCodes.DATE_AND_TIME };
  },
  STRING() {
    return { type: DataType.STRING, code: DataTypeCodes.STRING };
  },
  BYTE() {
    return { type: DataType.BYTE, code: DataTypeCodes.BYTE };
  },
  WORD() {
    return { type: DataType.WORD, code: DataTypeCodes.WORD };
  },
  DWORD() {
    return { type: DataType.DWORD, code: DataTypeCodes.DWORD };
  },
  LWORD() {
    return { type: DataType.LWORD, code: DataTypeCodes.LWORD };
  },
  STRING2() {
    return { type: DataType.STRING2, code: DataTypeCodes.STRING2 };
  },
  FTIME() {
    return { type: DataType.FTIME, code: DataTypeCodes.FTIME };
  },
  LTIME() {
    return { type: DataType.LTIME, code: DataTypeCodes.LTIME };
  },
  ITIME() {
    return { type: DataType.ITIME, code: DataTypeCodes.ITIME };
  },
  STRINGN() {
    return { type: DataType.STRINGN, code: DataTypeCodes.STRINGN };
  },
  SHORT_STRING() {
    return { type: DataType.SHORT_STRING, code: DataTypeCodes.SHORT_STRING };
  },
  TIME() {
    return { type: DataType.TIME, code: DataTypeCodes.TIME };
  },
  EPATH(padded, length) {
    // eslint-disable-next-line object-curly-newline
    return { type: DataType.EPATH, code: DataTypeCodes.EPATH, padded, length };
  },
  ENGUNIT() {
    return { type: DataType.ENGUNIT, code: DataTypeCodes.ENGUNIT };
  },
  STRINGI() {
    /** See CIP Vol 1, Appendix C-4.1 for abstract syntax notation */
    return {
      type: DataType.STRINGI,
      code: DataTypeCodes.STRINGI,
      itype: DataType.STRUCT([
        DataType.USINT, // Number of internationalized character strings
        DataType.PLACEHOLDER((length) => DataType.ARRAY(
          DataType.STRUCT(
            [
              DataType.TRANSFORM(
                /* First three characters of the ISO 639-2/T language */
                DataType.ARRAY(DataType.USINT, 0, 2),
                (val) => Buffer.from(val).toString('ascii'),
              ),
              // Structure of the character string (0xD0, 0xD5, 0xD9, or 0xDA)
              DataType.EPATH(false),
              DataType.UINT, // Character set which the character string is based on,
              DataType.PLACEHOLDER(), // Actual International character string
            ],
            (members, dt) => {
              if (members.length === 3) {
                return dt.resolve(members[1].value);
              }
              return undefined;
            },
          ),
          0,
          length - 1,
        )),
      ], (members, dt) => {
        if (members.length === 1) {
          return dt.resolve(members[0]); // provides the length for the array
        }
        return undefined;
      }),
    };
  },

  /** CIP Volume 1, C-6.2 Constructed Data Type Reporting */
  ABBREV_STRUCT(crc) {
    return {
      type: DataType.ABBREV_STRUCT,
      code: DataTypeCodes.ABBREV_STRUCT,
      constructed: true,
      abbreviated: true,
      crc,
    };
  },
  ABBREV_ARRAY(itemType, length) {
    return {
      type: DataType.ABBREV_ARRAY,
      code: DataTypeCodes.ABBREV_ARRAY,
      constructed: true,
      abbreviated: true,
      itemType,
      length,
    };
  },
  /**
   * decodeCallback(decodedMembers, memberDataType, structDataType)
   *  - is called before each member is decoded */
  STRUCT(members, decodeCallback) {
    return {
      type: DataType.STRUCT,
      code: DataTypeCodes.STRUCT,
      constructed: true,
      abbreviated: false,
      members,
      decodeCallback,
    };
  },
  ARRAY(itemType, lowerBound, upperBound, lowerBoundTag, upperBoundTag) {
    return {
      type: DataType.ARRAY,
      code: DataTypeCodes.ARRAY,
      constructed: true,
      abbreviated: false,
      itemType,
      lowerBound,
      upperBound,
      lowerBoundTag,
      upperBoundTag,
    };
  },
  PLACEHOLDER(resolve) {
    return {
      type: DataType.PLACEHOLDER,
      code: DataTypeCodes.PLACEHOLDER,
      resolve: resolve || ((dt) => dt),
    };
  },
  /**
   * decodeTransform transforms from CIP data type to friendly data type
   * encodeTransform transforms friendly data type to CIP data type
   * */
  TRANSFORM(dataType, decodeTransform, encodeTransform) {
    return {
      type: DataType.TRANSFORM,
      code: DataTypeCodes.TRANSFORM,
      dataType,
      decodeTransform,
      encodeTransform,
    };
  },
});