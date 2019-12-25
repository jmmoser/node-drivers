// 'use strict';

// const {
//   decodeUnsignedInteger,
//   sizeToEncodeUnsignedInteger,
//   encodeUnsignedInteger
// } = require('../../../../utils');


// const { DataType, DataTypeCodes, DataTypeNames } = require('../../datatypes');

// if (DataTypeCodes == null) {
//   // console.log(buffer, offset);
//   throw new Error('abc');
// }

// class DataTypeSegment {
//   constructor(value) {
//     this.value = value;
//   }

//   encodeSize() {
//     return encodeSize(this.value);
//   }

//   encode() {
//     const buffer = Buffer.alloc(this.encodeSize());
//     this.encodeTo(buffer, 0);
//     return buffer;
//   }

//   encodeTo(buffer, offset) {
//     return encodeTo(buffer, offset, this.value);
//   }

//   static Decode(segmentCode, buffer, offset, padded, cb) {
//     return DecodeDataType(buffer, offset - 1, type => {
//       if (typeof cb === 'function') {
//         cb(new DataTypeSegment(type));
//       }
//     });
//   }
// }

// module.exports = DataTypeSegment;



// function __DecodeDataType(buffer, offset, cb) {
//   let type;
//   const code = buffer.readUInt8(offset); offset += 1;
//   switch (code) {
//     case DataTypeCodes.ABBREV_STRUCT: {
//       const length = buffer.readUInt8(offset); offset += 1;
//       const crc = decodeUnsignedInteger(buffer, offset, length);
//       offset += length;
//       type = DataType.ABBREV_STRUCT(crc);
//       break;
//     }
//     case DataTypeCodes.ABBREV_ARRAY: {
//       /* const length = buffer.readUInt8(offset); */ offset += 1;
//       let itemType;
//       offset = __DecodeDataType(buffer, offset, items => itemType = items);
//       type = Datatype.ABBREV_ARRAY(itemType);
//       break;
//     }
//     case DataTypeCodes.STRUCT: {
//       const length = buffer.readUInt8(offset); offset += 1;
//       const members = [];
//       const lastOffset = offset + length;
//       while (offset < lastOffset) {
//         offset = __DecodeDataType(buffer, offset, function (member) {
//           members.push(member);
//         });
//       }
//       type = DataType.STRUCT(members);
//       break;
//     }
//     case DataTypeCodes.ARRAY: {
//       /* const length = buffer.readUInt8(offset); */ offset += 1;

//       const lowerBoundTag = buffer.readUInt8(offset); offset += 1;
//       const lowerBoundLength = buffer.readUInt8(offset); offset += 1;
//       const lowerBound = decodeUnsignedInteger(buffer, offset, lowerBoundLength);
//       offset += lowerBoundLength;

//       const upperBoundTag = buffer.readUInt8(offset); offset += 1;
//       const upperBoundLength = buffer.readUInt8(offset); offset += 1;
//       const upperBound = decodeUnsignedInteger(buffer, offset, upperBoundLength);
//       offset += upperBoundLength;

//       const boundTags = [lowerBoundTag, upperBoundTag];

//       let itemType;
//       offset = __DecodeDataType(buffer, offset, items => itemType = items);
//       type = DataType.ARRAY(itemType, lowerBound, upperBound, boundTags);
//       break;
//     }
//     default:
//       type = DataType[DataTypeNames[code]]();
//       break;
//   }

//   if (typeof cb === 'function') {
//     cb(type);
//   }

//   return offset;
// }


// function DecodeDataType(buffer, offset, cb) {
//   const nextOffset = __DecodeDataType(buffer, offset, cb);
//   if (nextOffset - offset === 1) {
//     /**
//      * If data type is elementary then __DecodeDataType will only
//      * read 1 byte but data type encoding is 2 bytes
//      */
//     return offset + 2;
//   }
//   return nextOffset;
// }


// function encodeSize(type) {
//   let size;
//   switch (type.code) {
//     case DataTypeCodes.STRUCT:
//       size = 2;
//       for (let i = 0; i < type.members.length; i++) {
//         size += encodeSize(type.members[i]);
//       }
//       break;
//     case DataTypeCodes.ARRAY:
//       size = 8 + encodeSize(type.itemType);
//     case DataTypeCodes.ABBREV_STRUCT:
//       size = 4;
//       break;
//     case DataTypeCodes.ABBREV_ARRAY:
//       size = 2 + encodeSize(type.itemType);
//       break;
//     default:
//       size = 1;
//   }
//   return size;
// }


// function __EncodeDataTypeTo(buffer, offset, type) {
//   offset = buffer.writeUInt8(type.code, offset);

//   switch (type.code) {
//     case DataType.STRUCT:
//       offset = buffer.writeUInt8(encodeSize(type), offset);
//       for (let i = 0; i < type.members; i++) {
//         offset = __EncodeDataTypeTo(buffer, offset, type.members[i]);
//       }
//       break;
//     case DataType.ABBREV_STRUCT:
//       offset = buffer.writeUInt8(2, offset);
//       offset = buffer.writeUInt16LE(type.crc, offset);
//       break;
//     case DataType.ARRAY:
//       offset = buffer.writeUInt8(encodeSize(type), offset);
//       offset = buffer.writeUInt8(type.lowerBoundTag, offset);
//       const lowerSize = sizeToEncodeUnsignedInteger(type.lowerBound);
//       offset = buffer.writeUInt8(lowerSize, offset);
//       offset = encodeUnsignedInteger(buffer, offset, type.lowerBound, lowerSize);
//       offset = buffer.writeUInt8(type.upperBoundTag, offset);
//       const upperSize = sizeToEncodeUnsignedInteger(type.upperBound);
//       offset = buffer.writeUInt8(upperSize, offset);
//       offset = encodeUnsignedInteger(buffer, offset, type.upperBound, upperSize);
//       offset = __EncodeDataTypeTo(buffer, offset, type.itemType);
//       break;
//     case DataType.ABBREV_ARRAY:
//       offset = buffer.writeUInt8(encodeSize(type), offset);
//       offset = __EncodeDataTypeTo(buffer, offset, type.itemType);
//       break;
//     default:
//       break;
//   }
//   return offset;
// }


// function encodeTo(buffer, offset, type) {
//   const nextOffset = __EncodeDataTypeTo(buffer, offset, type);
//   if (nextOffset - offset === 1) {
//     return buffer.writeUInt8(0, offset);
//   }
//   return nextOffset;
// }