'use strict';

const EPath = require('../epath');
const { DataTypeCodes, DataTypeNames } = require('./codes');
const convertToObject = require('./convertToObject');



function EncodeSize(dataType, value) {
  dataType = convertToObject(dataType);

  const dataTypeCode = dataType.code != null ? dataType.code : dataType;

  switch (dataTypeCode) {
    case DataTypeCodes.SINT:
    case DataTypeCodes.USINT:
    case DataTypeCodes.BYTE:
      return 1;
    case DataTypeCodes.INT:
    case DataTypeCodes.ITIME:
    case DataTypeCodes.UINT:
    case DataTypeCodes.WORD:
    case DataTypeCodes.ENGUNIT:
      return 2;
    case DataTypeCodes.DINT:
    case DataTypeCodes.TIME:
    case DataTypeCodes.FTIME:
    case DataTypeCodes.REAL:
    case DataTypeCodes.UDINT:
    case DataTypeCodes.DWORD:
    case DataTypeCodes.DATE:
      return 4;
    case DataTypeCodes.STRING:
      return 2 + Buffer.from(value, 'ascii').length;
    case DataTypeCodes.SHORT_STRING:
      return 1 + Buffer.from(value, 'ascii').length;
    case DataTypeCodes.STRING2:
      return 2 + Buffer.from(value, 'utf16le').length;
    case DataTypeCodes.LTIME:
    case DataTypeCodes.LINT:
    case DataTypeCodes.LWORD:
    case DataTypeCodes.ULINT:
    case DataTypeCodes.LREAL:
      return 8;
    case DataTypeCodes.EPATH:
      return EPath.EncodeSize(dataType.padded, value);
    case DataTypeCodes.ARRAY:
      return ((dataType.upperBound - dataType.lowerBound) + 1) * EncodeSize(dataType.itemType, value[0]);
    case DataTypeCodes.ABBREV_ARRAY:
      if (!Array.isArray(value)) {
        throw new Error(`Value must be an array to determine encoding size. Received ${typeof value}`);
      }
      if (value.length === 0) {
        return 0;
      }
      return value.length * EncodeSize(dataType.itemType, value[0]);
    case DataTypeCodes.STRUCT:
      let size = 0;
      for (let i = 0; i < dataType.members.length; i++) {
        size += EncodeSize(dataType.members[i], value[i]);
      }
      return size;
    case DataTypeCodes.TRANSFORM:
      return EncodeSize(dataType.dataType, dataType.encodeTransform(value));
    case DataTypeCodes.UNKNOWN:
      return dataType.length;
    default:
      throw new Error(`Encoding size for data type is not currently supported: ${DataTypeNames[dataTypeCode] || dataTypeCode}`);
  }
}


function Encode(dataType, value) {
  const buffer = Buffer.alloc(EncodeSize(dataType, value));
  EncodeTo(buffer, 0, dataType, value);
  return buffer;
}


function EncodeTo(buffer, offset, dataType, value) {
  if (dataType instanceof Function) dataType = dataType();

  const dataTypeCode = dataType.code != null ? dataType.code : dataType;

  switch (dataTypeCode) {
    case DataTypeCodes.SINT:
      offset = buffer.writeInt8(value, offset);
      break;
    case DataTypeCodes.USINT:
    case DataTypeCodes.BYTE:
      offset = buffer.writeUInt8(value, offset);
      break;
    case DataTypeCodes.INT:
    case DataTypeCodes.ITIME:
      offset = buffer.writeInt16LE(value, offset);
      break;
    case DataTypeCodes.UINT:
    case DataTypeCodes.WORD:
    case DataTypeCodes.ENGUNIT:
      offset = buffer.writeUInt16LE(value, offset);
      break;
    case DataTypeCodes.DINT:
    case DataTypeCodes.TIME:
    case DataTypeCodes.FTIME:
      offset = buffer.writeInt32LE(value, offset);
      break;
    case DataTypeCodes.UDINT:
    case DataTypeCodes.DWORD:
    case DataTypeCodes.DATE:
      offset = buffer.writeUInt32LE(value, offset);
      break;
    case DataTypeCodes.REAL:
      offset = buffer.writeFloatLE(value, offset);
      break;
    case DataTypeCodes.STRING: {
      const stringBuffer = Buffer.from(value, 'ascii');
      offset = buffer.writeUInt16LE(stringBuffer.length, offset);
      offset += stringBuffer.copy(buffer, offset);
      break;
    }
    case DataTypeCodes.SHORT_STRING: {
      const stringBuffer = Buffer.from(value, 'ascii');
      offset = buffer.writeUInt8(stringBuffer.length, offset);
      offset += stringBuffer.copy(buffer, offset);
      break;
    }
    case DataTypeCodes.STRING2: {
      const stringBuffer = Buffer.from(value, 'utf16le');
      /** Use [...value].length instead of value.length??? */
      offset = buffer.writeUInt16LE(value.length, offset);
      offset += stringBuffer.copy(buffer, offset);
      break;
    }
    case DataTypeCodes.LINT:
    case DataTypeCodes.LTIME:
      offset = buffer.writeBigInt64LE(BigInt(value), offset);
      break;
    case DataTypeCodes.LWORD:
    case DataTypeCodes.ULINT:
      offset = buffer.writeBigUInt64LE(BigInt(value), offset);
      break;
    case DataTypeCodes.LREAL:
      offset = buffer.writeDoubleLE(value, offset);
      break;
    case DataTypeCodes.EPATH:
      offset = EPath.EncodeTo(buffer, offset, dataType.padded, value);
      break;
    case DataTypeCodes.ARRAY:
    case DataTypeCodes.ABBREV_ARRAY: {
      if (!Array.isArray(value)) {
        throw new Error(`Value must be an array to encode an array. Received: ${typeof value}`);
      }
      for (let i = 0; i < value.length; i++) {
        offset = EncodeTo(buffer, offset, dataType.itemType, value[i]);
      }
      break;
    }
    case DataTypeCodes.STRUCT:
      if (!Array.isArray(value) || value.length !== dataType.members.length) {
        throw new Error(`Value must be an array to encode an array. Received: ${typeof value}`);
      }
      for (let i = 0; i < dataType.members.length; i++) {
        offset = EncodeTo(buffer, offset, dataType.members[i], value[i]);
      }
      break;
    case DataTypeCodes.TRANSFORM:
      offset = EncodeTo(buffer, offset, dataType.dataType, dataType.encodeTransform(value));
      break;
    case DataTypeCodes.BOOL:
      throw new Error(`Boolean encoding isn't currently supported, use BYTE instead`);
    default:
      throw new Error(`Encoding for data type is not currently supported: ${DataTypeNames[dataTypeCode] || dataTypeCode}`);
  }

  return offset;
}


module.exports = {
  EncodeSize,
  Encode,
  EncodeTo
};