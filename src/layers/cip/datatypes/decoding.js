'use strict';

const EPath = require('../epath');
const { DataTypeCodes, DataTypeNames } = require('./codes');


function Decode(dataType, buffer, offset, cb, ctx) {
  let value;

  if (dataType instanceof Function) dataType = dataType();

  if (ctx && ctx.dataTypeCallback) {
    /** Used to modify the datatype, especially with placeholders */
    dataType = ctx.dataTypeCallback(dataType) || dataType;

    /** dataTypeCallback may return a type function */
    if (dataType instanceof Function) dataType = dataType();
  }

  let dataTypeCode = dataType;

  if (typeof dataType === 'object') {
    dataTypeCode = dataType.code;

    if (dataType.itype) {
      return Decode(dataType.itype, buffer, offset, cb, ctx);
    }
  }

  switch (dataTypeCode) {
    case DataTypeCodes.BOOL:
      value = buffer.readUInt8(offset); offset += 1;
      if (dataType.info != null) {
        if (dataType.info > 7) {
          throw new Error(`Bit position too high: ${dataType.info}`);
        }
        value = getBit(value, dataType.info);
      }
      value = value > 0;
      break;
    case DataTypeCodes.SINT:
      value = buffer.readInt8(offset); offset += 1;
      break;
    case DataTypeCodes.USINT:
    case DataTypeCodes.BYTE:
      value = buffer.readUInt8(offset); offset += 1;
      break;
    case DataTypeCodes.INT:
    case DataTypeCodes.ITIME:
      value = buffer.readInt16LE(offset); offset += 2;
      break;
    case DataTypeCodes.UINT:
    case DataTypeCodes.WORD:
    case DataTypeCodes.ENGUNIT:
      value = buffer.readUInt16LE(offset); offset += 2;
      break;
    case DataTypeCodes.DINT:
    case DataTypeCodes.TIME:
    case DataTypeCodes.FTIME:
      value = buffer.readInt32LE(offset); offset += 4;
      break;
    case DataTypeCodes.REAL:
      value = buffer.readFloatLE(offset); offset += 4;
      break;
    case DataTypeCodes.UDINT:
    case DataTypeCodes.DWORD:
    case DataTypeCodes.DATE:
      value = buffer.readUInt32LE(offset); offset += 4;
      break;
    case DataTypeCodes.STRING: {
      const length = buffer.readUInt16LE(offset); offset += 2;
      value = buffer.toString('ascii', offset, offset + length); offset += length;
      break;
    }
    case DataTypeCodes.SHORT_STRING: {
      const length = buffer.readUInt8(offset); offset += 1;
      value = buffer.toString('ascii', offset, offset + length); offset += length;
      break;
    }
    case DataTypeCodes.STRING2: {
      const length = buffer.readUInt16LE(offset); offset += 2;
      value = buffer.toString('utf16le', offset, offset + 2 * length); offset += 2 * length;
      break;
    }
    case DataTypeCodes.STRINGN: {
      const width = buffer.readUInt16LE(offset); offset += 2;
      const length = buffer.readUInt16LE(offset); offset += 2;
      const total = width * length;
      value = buffer.toString('utf16le', offset, offset + total); offset += total;
      break;
    }
    case DataTypeCodes.LTIME:
    case DataTypeCodes.LINT:
      value = buffer.readBigInt64LE(offset); offset += 8;
      break;
    case DataTypeCodes.LWORD:
    case DataTypeCodes.ULINT:
      value = buffer.readBigUInt64LE(offset); offset += 8;
      break;
    case DataTypeCodes.LREAL:
      value = buffer.readDoubleLE(offset); offset += 8;
      break;
    case DataTypeCodes.STRUCT: {
      /** Name of members is not known so use array to hold decoded member values */
      value = [];

      const ctx = {};
      if (typeof dataType.decodeCallback === 'function') {
        ctx.dataTypeCallback = function (dt) {
          return dataType.decodeCallback(value, dt, dataType);
        };
      }

      dataType.members.forEach(member => {
        offset = Decode(member, buffer, offset, function (memberValue) {
          value.push(memberValue);
        }, ctx);
      });

      value = value.filter((val, idx) => {
        return !(dataType.members[idx].code === DataTypeCodes.SMEMBER && dataType.members[idx].filter === true);
      });

      break;
    }
    case DataTypeCodes.ARRAY: {
      value = [];
      for (let i = dataType.lowerBound; i <= dataType.upperBound; i++) {
        offset = Decode(dataType.itemType, buffer, offset, function (item) {
          value.push(item);
        });
      }
      break;
    }
    case DataTypeCodes.ABBREV_ARRAY: {
      value = [];
      if (dataType.length === true) {
        const bufferLength = buffer.length;
        while (offset < bufferLength) {
          const nextOffset = Decode(dataType.itemType, buffer, offset, function (item) {
            value.push(item);
          });
          /** Make sure nextOffset is greater than offset */
          if (nextOffset <= offset) {
            throw new Error(`Unexpected offset while decoding abbreviated array`);
          }
          offset = nextOffset;
        }
      } else {
        if (!Number.isInteger(dataType.length) || dataType.length < 0) {
          throw new Error('Abbreviate array length must be a non-negative integer to decode values');
        }
        for (let i = 0; i < dataType.length; i++) {
          offset = Decode(dataType.itemType, buffer, offset, function (item) {
            value.push(item);
          });
        }
      }
      
      break;
    }
    case DataTypeCodes.EPATH:
      offset = EPath.Decode(buffer, offset, dataType.length, dataType.padded, val => value = val);
      break;
    case DataTypeCodes.UNKNOWN: {
      value = buffer.slice(offset, offset + dataType.length);
      offset += dataType.length;
      break;
    }
    case DataTypeCodes.SMEMBER:
      offset = Decode(dataType.member, buffer, offset, val => value = val);
      break;
    case DataTypeCodes.TRANSFORM: {
      offset = Decode(dataType.dataType, buffer, offset, val => value = dataType.transform(val));
      break;
    }
    case DataTypeCodes.PLACEHOLDER:
      throw new Error(`Placeholder datatype should have been replaced before decoding`);
    default:
      throw new Error(`Decoding for data type is not currently supported: ${DataTypeNames[dataTypeCode] || dataTypeCode}`);
  }

  if (cb instanceof Function) {
    cb(value);
  }

  return offset;
}


module.exports = {
  Decode
};