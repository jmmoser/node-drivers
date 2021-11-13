import EPath from '../epath/index';
import { DataTypeCodes, DataTypeNames } from './codes';
import convertToObject from './convertToObject';
import { IDataType, IDataTypeOption, BoolDataType, StructDataType } from './types';

import {
  getBits,
  unsignedIntegerSize,
  decodeUnsignedInteger,
} from '../../../utils';

import { Ref } from '../../../types';

export function DecodeTypedData(buffer: Buffer, offsetRef: Ref, inputDataType: IDataTypeOption, ctx?: any): any {
  if (Array.isArray(inputDataType)) {
    return inputDataType.map((dataTypeItem) => DecodeTypedData(buffer, offsetRef, dataTypeItem, ctx));
  }

  let value: any;

  let dataType = convertToObject(inputDataType);

  if (ctx && ctx.dataTypeCallback) {
    /** Used to modify the datatype, especially with placeholders */
    dataType = convertToObject(ctx.dataTypeCallback(dataType) || dataType);
  }

  if ((dataType as any).itype) {
    return DecodeTypedData(buffer, offsetRef, (dataType as any).itype, ctx);
  }

  switch (dataType.code) {
    case DataTypeCodes.BOOL:
      const boolDataType = dataType as BoolDataType;
      if (boolDataType.position >= 32) {
        throw new Error('CIP boolean data type position out of range: ' + boolDataType.position);
      }
      /** BOOL does not change the offset */
      const integerValue = decodeUnsignedInteger(
        buffer,
        offsetRef.current,
        unsignedIntegerSize(boolDataType.position),
      );
      value = getBits(integerValue as number, boolDataType.position, boolDataType.position + 1) > 0;
      break;
    case DataTypeCodes.SINT:
      value = buffer.readInt8(offsetRef.current); offsetRef.current += 1;
      break;
    case DataTypeCodes.USINT:
    case DataTypeCodes.BYTE:
      value = buffer.readUInt8(offsetRef.current); offsetRef.current += 1;
      break;
    case DataTypeCodes.INT:
    case DataTypeCodes.ITIME:
      value = buffer.readInt16LE(offsetRef.current); offsetRef.current += 2;
      break;
    case DataTypeCodes.UINT:
    case DataTypeCodes.WORD:
    case DataTypeCodes.ENGUNIT:
      value = buffer.readUInt16LE(offsetRef.current); offsetRef.current += 2;
      break;
    case DataTypeCodes.DINT:
    case DataTypeCodes.TIME:
    case DataTypeCodes.FTIME:
      value = buffer.readInt32LE(offsetRef.current); offsetRef.current += 4;
      break;
    case DataTypeCodes.REAL:
      value = buffer.readFloatLE(offsetRef.current); offsetRef.current += 4;
      break;
    case DataTypeCodes.UDINT:
    case DataTypeCodes.DWORD:
    case DataTypeCodes.DATE:
      value = buffer.readUInt32LE(offsetRef.current); offsetRef.current += 4;
      break;
    case DataTypeCodes.STRING: {
      const length = buffer.readUInt16LE(offsetRef.current); offsetRef.current += 2;
      value = buffer.toString('ascii', offsetRef.current, offsetRef.current + length); offsetRef.current += length;
      break;
    }
    case DataTypeCodes.SHORT_STRING: {
      const length = buffer.readUInt8(offsetRef.current); offsetRef.current += 1;
      value = buffer.toString('ascii', offsetRef.current, offsetRef.current + length); offsetRef.current += length;
      break;
    }
    case DataTypeCodes.STRING2: {
      const length = buffer.readUInt16LE(offsetRef.current); offsetRef.current += 2;
      value = buffer.toString('utf16le', offsetRef.current, offsetRef.current + 2 * length); offsetRef.current += 2 * length;
      break;
    }
    case DataTypeCodes.STRINGN: {
      const width = buffer.readUInt16LE(offsetRef.current); offsetRef.current += 2;
      const length = buffer.readUInt16LE(offsetRef.current); offsetRef.current += 2;
      const total = width * length;
      value = buffer.toString('utf16le', offsetRef.current, offsetRef.current + total); offsetRef.current += total;
      break;
    }
    case DataTypeCodes.LTIME:
    case DataTypeCodes.LINT:
      value = buffer.readBigInt64LE(offsetRef.current); offsetRef.current += 8;
      break;
    case DataTypeCodes.LWORD:
    case DataTypeCodes.ULINT:
      value = buffer.readBigUInt64LE(offsetRef.current); offsetRef.current += 8;
      break;
    case DataTypeCodes.LREAL:
      value = buffer.readDoubleLE(offsetRef.current); offsetRef.current += 8;
      break;
    case DataTypeCodes.STRUCT: {
      const structDataType = dataType as StructDataType;
      /** Name of members is not known so use array to hold decoded member values */
      value = [];

      const subCtx = {} as {
        dataTypeCallback?: (dt: IDataType) => any
      };
      if (typeof structDataType.decodeCallback === 'function') {
        subCtx.dataTypeCallback = (dt: IDataType) => structDataType.decodeCallback(value, dt, structDataType);
      }

      for (let i = 0; i < structDataType.members.length; i++){
        const memberDataType = structDataType.members[i];
        value.push(DecodeTypedData(buffer, offsetRef, memberDataType, subCtx));
      }

      break;
    }
    case DataTypeCodes.ARRAY: {
      value = [];
      for (let i = dataType.lowerBound; i <= dataType.upperBound; i++) {
        value.push(DecodeTypedData(buffer, offsetRef, dataType.itemType));
      }
      break;
    }
    case DataTypeCodes.ABBREV_ARRAY: {
      value = [];
      if (dataType.length === true) {
        while (offsetRef.current < buffer.length) {
          const previousOffset = offsetRef.current;
          value.push(DecodeTypedData(buffer, offsetRef, dataType.itemType));
          /** Make sure nextOffset is greater than offset */
          if (offsetRef.current <= previousOffset) {
            throw new Error('Unexpected offset while decoding abbreviated array');
          }
        }
      } else {
        if (!Number.isInteger(dataType.length) || dataType.length < 0) {
          throw new Error(`Abbreviate array length must be a non-negative integer to decode values. Received: ${dataType.length}`);
        }
        for (let i = 0; i < dataType.length; i++) {
          value.push(DecodeTypedData(buffer, offsetRef, dataType.itemType));
        }
      }

      break;
    }
    case DataTypeCodes.EPATH:
      value = EPath.Decode(buffer, offsetRef, dataType.length, dataType.padded);
      break;
    case DataTypeCodes.UNKNOWN: {
      value = buffer.slice(offsetRef.current, offsetRef.current + dataType.length);
      offsetRef.current += dataType.length;
      break;
    }
    case DataTypeCodes.TRANSFORM: {
      value = dataType.decodeTransform(DecodeTypedData(
        buffer,
        offsetRef,
        dataType.dataType,
      ));
      break;
    }
    case DataTypeCodes.PLACEHOLDER:
      throw new Error('Placeholder datatype should have been replaced before decoding');
    default:
      throw new Error(`Decoding for data type is not currently supported: ${DataTypeNames[dataType.code] || dataType.code}`);
  }

  return value;
}
