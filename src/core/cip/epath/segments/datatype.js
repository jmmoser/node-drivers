import {
  decodeUnsignedInteger,
  unsignedIntegerSize,
  encodeUnsignedInteger,
} from '../../../../utils.js';

import convertDataTypeToObject from '../../datatypes/convertToObject.js';
import { DataTypeCodes, DataTypeNames } from '../../datatypes/codes.js';
import { DataType } from '../../datatypes/types.js';

function DecodeDataType(buffer, offsetRef) {
  let type;
  const code = buffer.readUInt8(offsetRef.current); offsetRef.current += 1;
  switch (code) {
    case DataTypeCodes.ABBREV_STRUCT: {
      const length = buffer.readUInt8(offsetRef.current); offsetRef.current += 1;
      const crc = decodeUnsignedInteger(buffer, offsetRef.current, length);
      offsetRef.current += length;
      type = DataType.ABBREV_STRUCT(crc);
      break;
    }
    case DataTypeCodes.ABBREV_ARRAY: {
      /* const length = buffer.readUInt8(offset); */ offsetRef.current += 1;
      const itemType = DecodeDataType(buffer, offsetRef);
      type = DataType.ABBREV_ARRAY(itemType);
      break;
    }
    case DataTypeCodes.STRUCT: {
      const length = buffer.readUInt8(offsetRef.current); offsetRef.current += 1;
      const members = [];
      const lastOffset = offsetRef.current + length;
      while (offsetRef.current < lastOffset) {
        members.push(DecodeDataType(buffer, offsetRef));
      }
      type = DataType.STRUCT(members);
      break;
    }
    case DataTypeCodes.ARRAY: {
      /* const length = buffer.readUInt8(offset); */ offsetRef.current += 1;

      const lowerBoundTag = buffer.readUInt8(offsetRef.current); offsetRef.current += 1;
      const lowerBoundLength = buffer.readUInt8(offsetRef.current); offsetRef.current += 1;
      const lowerBound = decodeUnsignedInteger(buffer, offsetRef.current, lowerBoundLength);
      offsetRef.current += lowerBoundLength;

      const upperBoundTag = buffer.readUInt8(offsetRef.current); offsetRef.current += 1;
      const upperBoundLength = buffer.readUInt8(offsetRef.current); offsetRef.current += 1;
      const upperBound = decodeUnsignedInteger(buffer, offsetRef.current, upperBoundLength);
      offsetRef.current += upperBoundLength;

      const itemType = DecodeDataType(buffer, offsetRef);
      type = DataType.ARRAY(itemType, lowerBound, upperBound, lowerBoundTag, upperBoundTag);
      break;
    }
    default:
      type = DataType[DataTypeNames[code]];
      break;
  }

  return type;
}

function encodeSize(type) {
  type = convertDataTypeToObject(type);
  let size;
  switch (type.code) {
    case DataTypeCodes.STRUCT:
      size = 2;
      for (let i = 0; i < type.members.length; i++) {
        size += encodeSize(type.members[i]);
      }
      break;
    case DataTypeCodes.ARRAY:
      size = 8 + encodeSize(type.itemType);
      break;
    case DataTypeCodes.ABBREV_STRUCT:
      size = 4;
      break;
    case DataTypeCodes.ABBREV_ARRAY:
      size = 2 + encodeSize(type.itemType);
      break;
    default:
      size = 1;
  }
  return size;
}

function encodeTo(buffer, offset, type) {
  type = convertDataTypeToObject(type);
  offset = buffer.writeUInt8(type.code, offset);

  switch (type.code) {
    case DataTypeCodes.STRUCT:
      offset = buffer.writeUInt8(encodeSize(type) - 2, offset);
      for (let i = 0; i < type.members.length; i++) {
        offset = encodeTo(buffer, offset, type.members[i]);
      }
      break;
    case DataTypeCodes.ABBREV_STRUCT:
      offset = buffer.writeUInt8(encodeSize(type) - 2, offset);
      offset = buffer.writeUInt16LE(type.crc, offset);
      break;
    case DataTypeCodes.ARRAY: {
      offset = buffer.writeUInt8(encodeSize(type) - 2, offset);
      offset = buffer.writeUInt8(type.lowerBoundTag, offset);
      const lowerSize = unsignedIntegerSize(type.lowerBound);
      offset = buffer.writeUInt8(lowerSize, offset);
      offset = encodeUnsignedInteger(buffer, offset, type.lowerBound, lowerSize);
      offset = buffer.writeUInt8(type.upperBoundTag, offset);
      const upperSize = unsignedIntegerSize(type.upperBound);
      offset = buffer.writeUInt8(upperSize, offset);
      offset = encodeUnsignedInteger(buffer, offset, type.upperBound, upperSize);
      offset = encodeTo(buffer, offset, type.itemType);
      break;
    }
    case DataTypeCodes.ABBREV_ARRAY:
      offset = buffer.writeUInt8(encodeSize(type) - 2, offset);
      offset = encodeTo(buffer, offset, type.itemType);
      break;
    default:
      break;
  }
  return offset;
}

export default class DataTypeSegment {
  constructor(value) {
    this.value = convertDataTypeToObject(value);
  }

  encodeSize() {
    return encodeSize(this.value);
  }

  encode() {
    const buffer = Buffer.alloc(this.encodeSize());
    this.encodeTo(buffer, 0);
    return buffer;
  }

  encodeTo(buffer, offset) {
    return encodeTo(buffer, offset, this.value);
  }

  static Decode(buffer, offsetRef /* , segmentCode, padded */) {
    offsetRef.current -= 1;
    return new DataTypeSegment(DecodeDataType(buffer, offsetRef));
  }
}
