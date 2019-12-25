// 'use strict';

// const {
//   getBit,
//   // decodeUnsignedInteger,
//   InvertKeyValues
// } = require('../../utils');

// const EPath = require('./EPath');

// /** CIP Vol1 Table C-6.1 */
// const DataTypeCodes = Object.freeze({
//   /** DATATYPES FROM EXTERNAL SOURCES CANNOT BE NEGATIVE BECAUSE CODE IS READ AS UNSIGNED */
//   TRANSFORM: -4,
//   PLACEHOLDER: -3, /** used when previously decoded data determines datatype */
//   SMEMBER: -2,
//   UNKNOWN: -1,

//   BOOL: 0xC1,
//   SINT: 0xC2,
//   INT: 0xC3,
//   DINT: 0xC4,
//   LINT: 0xC5,
//   USINT: 0xC6,
//   UINT: 0xC7,
//   UDINT: 0xC8,
//   ULINT: 0xC9,
//   REAL: 0xCA,
//   LREAL: 0xCB,
//   STIME: 0xCC,
//   DATE: 0xCD,
//   TIME_OF_DAY: 0xCE,
//   DATE_AND_TIME: 0xCF,
//   STRING: 0xD0,
//   BYTE: 0xD1,
//   WORD: 0xD2,
//   DWORD: 0xD3,
//   LWORD: 0xD4,
//   STRING2: 0xD5,
//   FTIME: 0xD6,
//   LTIME: 0xD7,
//   ITIME: 0xD8,
//   STRINGN: 0xD9,
//   SHORT_STRING: 0xDA,
//   TIME: 0xDB,
//   EPATH: 0xDC,
//   ENGUNIT: 0xDD,
//   STRINGI: 0xDE,

//   /** CIP Volume 1, C-6.2 Constructed Data Type Reporting */
//   ABBREV_STRUCT: 0xA0, /* Data is an abbreviated struct type, i.e. a CRC of the actual type descriptor */
//   ABBREV_ARRAY: 0xA1, /* Data is an abbreviated array type. The limits are left off */
//   STRUCT: 0xA2, /* Data is a struct type descriptor */
//   ARRAY: 0xA3 /* Data is an array type descriptor */
// });

// const DataTypeNames = InvertKeyValues(DataTypeCodes);


// const DataType = Object.freeze({
//   UNKNOWN(length) {
//     return { type: DataType.UNKNOWN, code: DataTypeCodes.UNKNOWN, length };
//   },

//   /** Elementary Types */
//   BOOL(position) {
//     return { type: DataType.BOOL, code: DataTypeCodes.BOOL, position };
//   },
//   SINT() {
//     return { type: DataType.SINT, code: DataTypeCodes.SINT };
//   },
//   INT() {
//     return { type: DataType.INT, code: DataTypeCodes.INT };
//   },
//   DINT() {
//     return { type: DataType.DINT, code: DataTypeCodes.DINT };
//   },
//   LINT() {
//     return { type: DataType.LINT, code: DataTypeCodes.LINT };
//   },
//   USINT() {
//     return { type: DataType.USINT, code: DataTypeCodes.USINT };
//   },
//   UINT() {
//     return { type: DataType.UINT, code: DataTypeCodes.UINT };
//   },
//   UDINT() {
//     return { type: DataType.UDINT, code: DataTypeCodes.UDINT };
//   },
//   ULINT() {
//     return { type: DataType.ULINT, code: DataTypeCodes.ULINT };
//   },
//   REAL() {
//     return { type: DataType.REAL, code: DataTypeCodes.REAL };
//   },
//   LREAL() {
//     return { type: DataType.LREAL, code: DataTypeCodes.LREAL };
//   },
//   STIME() {
//     return { type: DataType.STIME, code: DataTypeCodes.STIME };
//   },
//   DATE() {
//     return { type: DataType.DATE, code: DataTypeCodes.DATE };
//   },
//   TIME_OF_DAY() {
//     return { type: DataType.TIME_OF_DAY, code: DataTypeCodes.TIME_OF_DAY };
//   },
//   DATE_AND_TIME() {
//     return { type: DataType.DATE_AND_TIME, code: DataTypeCodes.DATE_AND_TIME };
//   },
//   STRING() {
//     return { type: DataType.STRING, code: DataTypeCodes.STRING };
//   },
//   BYTE() {
//     return { type: DataType.BYTE, code: DataTypeCodes.BYTE };
//   },
//   WORD() {
//     return { type: DataType.WORD, code: DataTypeCodes.WORD };
//   },
//   DWORD() {
//     return { type: DataType.DWORD, code: DataTypeCodes.DWORD };
//   },
//   LWORD() {
//     return { type: DataType.LWORD, code: DataTypeCodes.LWORD };
//   },
//   STRING2() {
//     return { type: DataType.STRING2, code: DataTypeCodes.STRING2 };
//   },
//   FTIME() {
//     return { type: DataType.FTIME, code: DataTypeCodes.FTIME };
//   },
//   LTIME() {
//     return { type: DataType.LTIME, code: DataTypeCodes.LTIME };
//   },
//   ITIME() {
//     return { type: DataType.ITIME, code: DataTypeCodes.ITIME };
//   },
//   STRINGN() {
//     return { type: DataType.STRINGN, code: DataTypeCodes.STRINGN };
//   },
//   SHORT_STRING() {
//     return { type: DataType.SHORT_STRING, code: DataTypeCodes.SHORT_STRING };
//   },
//   TIME() {
//     return { type: DataType.TIME, code: DataTypeCodes.TIME };
//   },
//   EPATH(padded, length) {
//     return { type: DataType.EPATH, code: DataTypeCodes.EPATH, padded, length };
//   },
//   ENGUNIT() {
//     return { type: DataType.ENGUNIT, code: DataTypeCodes.ENGUNIT };
//   },
//   STRINGI() {
//     /** See CIP Vol 1, Appendix C-4.1 for abstract syntax notation */
//     return {
//       type: DataType.STRINGI,
//       code: DataTypeCodes.STRINGI,
//       itype: DataType.STRUCT([
//         DataType.USINT, // Number of internationalized character strings
//         DataType.PLACEHOLDER((length) => DataType.ARRAY(
//           DataType.STRUCT([
//             DataType.TRANSFORM(
//               DataType.ARRAY(DataType.USINT, 0, 2), // First three characters of the ISO 639-2/T language
//               val => Buffer.from(val).toString('ascii')
//             ),
//             DataType.EPATH(false), // Structure of the character string (0xD0, 0xD5, 0xD9, or 0xDA)
//             DataType.UINT, // Character set which the character string is based on,
//             DataType.PLACEHOLDER(code => { // Actual International character string
//               switch (code) {
//                 case DataTypeCodes.STRING:
//                   return DataType.STRING;
//                 case DataTypeCodes.STRING2:
//                   return DataType.STRING2;
//                 case DataTypeCodes.STRINGN:
//                   return DataType.STRINGN;
//                 case DataTypeCodes.SHORT_STRING:
//                   return DataType.SHORT_STRING;
//                 default:
//                   throw new Error(`Invalid internationalized string data type ${code}`);
//               }
//             })
//           ], function (members, dt) {
//             if (members.length === 3) {
//               return dt.resolve(members[1].value.code);
//             }
//           }), 0, length - 1)
//         ),
//       ], function decodeCallback(members, dt) {
//         if (members.length === 1) {
//           return dt.resolve(members[0]); // provides the length for the array
//         }
//       })
//     };
//   },

//   /** CIP Volume 1, C-6.2 Constructed Data Type Reporting */
//   ABBREV_STRUCT(crc) {
//     return {
//       type: DataType.ABBREV_STRUCT,
//       code: DataTypeCodes.ABBREV_STRUCT,
//       constructed: true,
//       abbreviated: true,
//       crc
//     };
//   },
//   ABBREV_ARRAY(itemType) {
//     return {
//       type: DataType.ABBREV_ARRAY,
//       code: DataTypeCodes.ABBREV_ARRAY,
//       constructed: true,
//       abbreviated: true,
//       itemType
//     };
//   },
//   /**
//    * decodeCallback(decodedMembers, memberDataType, structDataType)
//    *  - is called before each member is decoded */
//   STRUCT(members, decodeCallback) {
//     return {
//       type: DataType.STRUCT,
//       code: DataTypeCodes.STRUCT,
//       constructed: true,
//       abbreviated: false,
//       members,
//       decodeCallback
//     };
//   },
//   ARRAY(itemType, lowerBound, upperBound, boundTags) {
//     return {
//       type: DataType.ARRAY,
//       code: DataTypeCodes.ARRAY,
//       constructed: true,
//       abbreviated: false,
//       itemType,
//       lowerBound,
//       upperBound,
//       boundTags
//     };
//   },

//   SMEMBER(member, filter) {
//     return { type: DataType.SMEMBER, code: DataTypeCodes.SMEMBER, member, filter }
//   },
//   PLACEHOLDER(resolve) {
//     return {
//       type: DataType.PLACEHOLDER,
//       code: DataTypeCodes.PLACEHOLDER,
//       resolve
//     }
//   },
//   TRANSFORM(dataType, transform) {
//     return { type: DataType.TRANSFORM, code: DataTypeCodes.TRANSFORM, dataType, transform };
//   }
// });


// // function __DecodeDataType(buffer, offset, cb) {
// //   let type;
// //   const code = buffer.readUInt8(offset); offset += 1;
// //   switch (code) {
// //     case DataTypeCodes.ABBREV_STRUCT: {
// //       const length = buffer.readUInt8(offset); offset += 1;
// //       const crc = decodeUnsignedInteger(buffer, offset, length);
// //       offset += length;
// //       type = DataType.ABBREV_STRUCT(crc);
// //       break;
// //     }
// //     case DataTypeCodes.ABBREV_ARRAY: {
// //       /* const length = buffer.readUInt8(offset); */ offset += 1;
// //       let itemType;
// //       offset = __DecodeDataType(buffer, offset, items => itemType = items);
// //       type = Datatype.ABBREV_ARRAY(itemType);
// //       break;
// //     }
// //     case DataTypeCodes.STRUCT: {
// //       const length = buffer.readUInt8(offset); offset += 1;
// //       const members = [];
// //       const lastOffset = offset + length;
// //       while (offset < lastOffset) {
// //         offset = __DecodeDataType(buffer, offset, function (member) {
// //           members.push(member);
// //         });
// //       }
// //       type = DataType.STRUCT(members);
// //       break;
// //     }
// //     case DataTypeCodes.ARRAY: {
// //       /* const length = buffer.readUInt8(offset); */ offset += 1;

// //       const lowerBoundTag = buffer.readUInt8(offset); offset += 1;
// //       const lowerBoundLength = buffer.readUInt8(offset); offset += 1;
// //       const lowerBound = decodeUnsignedInteger(buffer, offset, lowerBoundLength);
// //       offset += lowerBoundLength;

// //       const upperBoundTag = buffer.readUInt8(offset); offset += 1;
// //       const upperBoundLength = buffer.readUInt8(offset); offset += 1;
// //       const upperBound = decodeUnsignedInteger(buffer, offset, upperBoundLength);
// //       offset += upperBoundLength;

// //       const boundTags = [lowerBoundTag, upperBoundTag];

// //       let itemType;
// //       offset = __DecodeDataType(buffer, offset, items => itemType = items);
// //       type = DataType.ARRAY(itemType, lowerBound, upperBound, boundTags);
// //       break;
// //     }
// //     default:
// //       type = DataType[DataTypeNames[code]]();
// //       break;
// //   }

// //   if (typeof cb === 'function') {
// //     cb(type);
// //   }

// //   return offset;
// // }


// // function DecodeDataType(buffer, offset, cb) {
// //   const nextOffset = __DecodeDataType(buffer, offset, cb);
// //   if (nextOffset - offset === 1) {
// //     /**
// //      * If data type is elementary then __DecodeDataType will only
// //      * read 1 byte but data type encoding is 2 bytes
// //      */
// //     return offset + 2;
// //   }
// //   return nextOffset;
// // }


// function Decode(dataType, buffer, offset, cb, ctx) {
//   let value;

//   if (dataType instanceof Function) dataType = dataType();

//   if (ctx && ctx.dataTypeCallback) {
//     /** Used to modify the datatype, especially with placeholders */
//     dataType = ctx.dataTypeCallback(dataType) || dataType;

//     /** dataTypeCallback may return a type function */
//     if (dataType instanceof Function) dataType = dataType();
//   }

//   let dataTypeCode = dataType;

//   if (typeof dataType === 'object') {
//     dataTypeCode = dataType.code;

//     if (dataType.itype) {
//       return Decode(dataType.itype, buffer, offset, cb, ctx);
//     }
//   }

//   switch (dataTypeCode) {
//     case DataTypeCodes.SINT:
//       value = buffer.readInt8(offset); offset += 1;
//       break;
//     case DataTypeCodes.USINT:
//     case DataTypeCodes.BYTE:
//       value = buffer.readUInt8(offset); offset += 1;
//       break;
//     case DataTypeCodes.INT:
//     case DataTypeCodes.ITIME:
//       value = buffer.readInt16LE(offset); offset += 2;
//       break;
//     case DataTypeCodes.UINT:
//     case DataTypeCodes.WORD:
//     case DataTypeCodes.ENGUNIT:
//       value = buffer.readUInt16LE(offset); offset += 2;
//       break;
//     case DataTypeCodes.DINT:
//     case DataTypeCodes.TIME:
//     case DataTypeCodes.FTIME:
//       value = buffer.readInt32LE(offset); offset += 4;
//       break;
//     case DataTypeCodes.REAL:
//       value = buffer.readFloatLE(offset); offset += 4;
//       break;
//     case DataTypeCodes.BOOL:
//       value = buffer.readUInt8(offset); offset += 1;
//       if (dataType.info != null) {
//         if (dataType.info > 7) {
//           throw new Error(`Bit position too high: ${dataType.info}`);
//         }
//         value = getBit(value, dataType.info);
//       }
//       value = value > 0;
//       break;
//     case DataTypeCodes.UDINT:
//     case DataTypeCodes.DWORD:
//     case DataTypeCodes.DATE:
//       value = buffer.readUInt32LE(offset); offset += 4;
//       break;
//     case DataTypeCodes.STRING: {
//       const length = buffer.readUInt16LE(offset); offset += 2;
//       value = buffer.toString('ascii', offset, offset + length); offset += length;
//       break;
//     }
//     case DataTypeCodes.SHORT_STRING: {
//       const length = buffer.readUInt8(offset); offset += 1;
//       value = buffer.toString('ascii', offset, offset + length); offset += length;
//       break;
//     }
//     case DataTypeCodes.STRING2: {
//       const length = buffer.readUInt16LE(offset); offset += 2;
//       value = buffer.toString('utf16le', offset, offset + 2 * length); offset += 2 * length;
//       break;
//     }
//     case DataTypeCodes.STRINGN: {
//       const width = buffer.readUInt16LE(offset); offset += 2;
//       const length = buffer.readUInt16LE(offset); offset += 2;
//       const total = width * length;
//       value = buffer.toString('utf16le', offset, offset + total); offset += total;
//       break;
//     }
//     case DataTypeCodes.LTIME:
//     case DataTypeCodes.LINT:
//       value = buffer.readBigInt64LE(offset); offset += 8;
//       break;
//     case DataTypeCodes.LWORD:
//     case DataTypeCodes.ULINT:
//       value = buffer.readBigUInt64LE(offset); offset += 8;
//       break;
//     case DataTypeCodes.LREAL:
//       value = buffer.readDoubleLE(offset); offset += 8;
//       break;
//     case DataTypeCodes.SMEMBER:
//       offset = Decode(dataType.member, buffer, offset, val => value = val);
//       break;
//     case DataTypeCodes.STRUCT: {
//       /** Name of members is not known so use array to hold decoded member values */
//       value = [];

//       const ctx = {};
//       if (typeof dataType.decodeCallback === 'function') {
//         ctx.dataTypeCallback = function (dt) {
//           return dataType.decodeCallback(value, dt, dataType);
//         };
//       }

//       dataType.members.forEach(member => {
//         offset = Decode(member, buffer, offset, function (memberValue) {
//           value.push(memberValue);
//         }, ctx);
//       });

//       value = value.filter((val, idx) => {
//         return !(dataType.members[idx].code === DataTypeCodes.SMEMBER && dataType.members[idx].filter === true);
//       });

//       break;
//     }
//     case DataTypeCodes.ARRAY: {
//       value = [];
//       for (let i = dataType.lowerBound; i <= dataType.upperBound; i++) {
//         offset = Decode(dataType.itemType, buffer, offset, function (item) {
//           value.push(item)
//         });
//       }
//       break;
//     }
//     case DataTypeCodes.EPATH:
//       offset = EPath.Decode(buffer, offset, dataType.length, dataType.padded, val => value = val);
//       break;
//     case DataTypeCodes.UNKNOWN: {
//       value = buffer.slice(offset, offset + dataType.length);
//       offset += dataType.length;
//       break;
//     }
//     case DataTypeCodes.TRANSFORM: {
//       offset = Decode(dataType.dataType, buffer, offset, val => value = dataType.transform(val));
//       break;
//     }
//     case DataTypeCodes.PLACEHOLDER:
//       throw new Error(`Placeholder datatype should have been replaced before decoding`);
//     default:
//       throw new Error(`Decoding for data type is not currently supported: ${DataTypeNames[dataTypeCode] || dataTypeCode}`);
//   }

//   if (cb instanceof Function) {
//     cb(value);
//   }

//   return offset;
// }





// function EncodeSize(dataType, value) {
//   if (dataType instanceof Function) dataType = dataType();

//   const dataTypeCode = dataType.code != null ? dataType.code : dataType;

//   switch (dataTypeCode) {
//     case DataTypeCodes.SINT:
//     case DataTypeCodes.USINT:
//     case DataTypeCodes.BYTE:
//       return 1;
//     case DataTypeCodes.INT:
//     case DataTypeCodes.ITIME:
//     case DataTypeCodes.UINT:
//     case DataTypeCodes.WORD:
//     case DataTypeCodes.ENGUNIT:
//       return 2;
//     case DataTypeCodes.DINT:
//     case DataTypeCodes.TIME:
//     case DataTypeCodes.FTIME:
//     case DataTypeCodes.REAL:
//     case DataTypeCodes.UDINT:
//     case DataTypeCodes.DWORD:
//     case DataTypeCodes.DATE:
//       return 4;
//     case DataTypeCodes.STRING:
//       return 2 + Buffer.from(value, 'ascii').length;
//     case DataTypeCodes.SHORT_STRING:
//       return 1 + Buffer.from(value, 'ascii').length;
//     case DataTypeCodes.STRING2:
//       return 2 + Buffer.from(value, 'utf16le').length;
//     case DataTypeCodes.LTIME:
//     case DataTypeCodes.LINT:
//     case DataTypeCodes.LWORD:
//     case DataTypeCodes.ULINT:
//     case DataTypeCodes.LREAL:
//       return 8;
//     case DataTypeCodes.EPATH:
//       return EPath.EncodeSize(dataType.padded, value);
//     case DataTypeCodes.ARRAY:
//       return ((dataType.upperBound - dataType.lowerBound) + 1) * EncodeSize(dataType.itemType, value[0]);
//     case DataTypeCodes.ABBREV_ARRAY:
//       if (!Array.isArray(value)) {
//         throw new Error(`Value must be an array to determine encoding size. Received ${typeof value}`);
//       }
//       if (value.length === 0) {
//         return 0;
//       }
//       return value.length * EncodeSize(dataType.itemType, value[0]);
//     case DataTypeCodes.STRUCT:
//       let size = 0;
//       for (let i = 0; i < dataType.members.length; i++) {
//         size += EncodeSize(dataType.members[i], value[i]);
//       }
//       return size;
//     default:
//       throw new Error(`Encoding size for data type is not currently supported: ${DataTypeNames[dataTypeCode] || dataTypeCode}`);
//   }
// }


// function Encode(dataType, value) {
//   const buffer = Buffer.alloc(EncodeSize(dataType, value));
//   EncodeTo(buffer, 0, dataType, value);
//   return buffer;
// }


// function EncodeTo(buffer, offset, dataType, value) {
//   if (dataType instanceof Function) dataType = dataType();

//   const dataTypeCode = dataType.code != null ? dataType.code : dataType;

//   switch (dataTypeCode) {
//     case DataTypeCodes.SINT:
//       offset = buffer.writeInt8(value, offset);
//       break;
//     case DataTypeCodes.USINT:
//     case DataTypeCodes.BYTE:
//       offset = buffer.writeUInt8(value, offset);
//       break;
//     case DataTypeCodes.INT:
//     case DataTypeCodes.ITIME:
//       offset = buffer.writeInt16LE(value, offset);
//       break;
//     case DataTypeCodes.UINT:
//     case DataTypeCodes.WORD:
//     case DataTypeCodes.ENGUNIT:
//       offset = buffer.writeUInt16LE(value, offset);
//       break;
//     case DataTypeCodes.DINT:
//     case DataTypeCodes.TIME:
//     case DataTypeCodes.FTIME:
//       offset = buffer.writeInt32LE(value, offset);
//       break;
//     case DataTypeCodes.UDINT:
//     case DataTypeCodes.DWORD:
//     case DataTypeCodes.DATE:
//       offset = buffer.writeUInt32LE(value, offset);
//       break;
//     case DataTypeCodes.REAL:
//       offset = buffer.writeFloatLE(value, offset);
//       break;
//     case DataTypeCodes.STRING: {
//       const stringBuffer = Buffer.from(value, 'ascii');
//       offset = buffer.writeUInt16LE(stringBuffer.length, offset);
//       offset += stringBuffer.copy(buffer, offset);
//       break;
//     }
//     case DataTypeCodes.SHORT_STRING: {
//       const stringBuffer = Buffer.from(value, 'ascii');
//       offset = buffer.writeUInt8(stringBuffer.length, offset);
//       offset += stringBuffer.copy(buffer, offset);
//       break;
//     }
//     case DataTypeCodes.STRING2: {
//       const stringBuffer = Buffer.from(value, 'utf16le');
//       /** Use [...value].length instead of value.length??? */
//       offset = buffer.writeUInt16LE(value.length, offset);
//       offset += stringBuffer.copy(buffer, offset);
//       break;
//     }
//     case DataTypeCodes.LINT:
//     case DataTypeCodes.LTIME:
//       offset = buffer.writeBigInt64LE(BigInt(value), offset);
//       break;
//     case DataTypeCodes.LWORD:
//     case DataTypeCodes.ULINT:
//       offset = buffer.writeBigUInt64LE(BigInt(value), offset);
//       break;
//     case DataTypeCodes.LREAL:
//       offset = buffer.writeDoubleLE(value, offset);
//       break;
//     case DataTypeCodes.EPATH:
//       offset = EPath.EncodeTo(buffer, offset, dataType.padded, value);
//       break;
//     case DataTypeCodes.ARRAY:
//     case DataTypeCodes.ABBREV_ARRAY: {
//       if (!Array.isArray(value)) {
//         throw new Error(`Value must be an array to encode an array. Received: ${typeof value}`);
//       }
//       for (let i = 0; i < value.length; i++) {
//         offset = EncodeTo(buffer, offset, dataType.itemType, value[i]);
//       }
//       break;
//     }
//     case DataTypeCodes.STRUCT:
//       if (!Array.isArray(value) || value.length !== dataType.members.length) {
//         throw new Error(`Value must be an array to encode an array. Received: ${typeof value}`);
//       }
//       for (let i = 0; i < dataType.members.length; i++) {
//         offset = EncodeTo(buffer, offset, dataType.members[i], value[i]);
//       }
//       return offset;
//     case DataTypeCodes.BOOL:
//       throw new Error(`Boolean encoding isn't currently supported, use BYTE instead`);
//     default:
//       throw new Error(`Encoding for data type is not currently supported: ${DataTypeNames[dataTypeCode] || dataTypeCode}`);
//   }

//   return offset;
// }


// module.exports = {
//   DataTypeCodes,
//   DataType,
//   DataTypeNames,
//   Decode,
//   Encode,
//   EncodeTo,
//   EncodeSize,
//   // DecodeDataType
// };