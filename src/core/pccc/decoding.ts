import {
  getBits,
} from '../../utils.js';

import {
  DataType,
} from './constants.js';

import { Ref } from '../../types';

export function DecodeDataDescriptor(data: Buffer, offsetRef: Ref) {
  const flag = data.readUInt8(offsetRef.current); offsetRef.current += 1;

  let type;
  let size;

  if (getBits(flag, 7, 8)) {
    const dataTypeBytes = getBits(flag, 4, 7);
    switch (dataTypeBytes) {
      case 1:
        type = data.readUInt8(offsetRef.current);
        break;
      case 2:
        type = data.readUInt16LE(offsetRef.current);
        break;
      case 4:
        type = data.readUInt32LE(offsetRef.current);
        break;
      default:
        //
    }
    offsetRef.current += dataTypeBytes;
  } else {
    type = getBits(flag, 4, 7);
  }

  if (getBits(flag, 3, 4)) {
    const dataTypeSizeBytes = getBits(flag, 0, 3);
    switch (dataTypeSizeBytes) {
      case 1:
        size = data.readUInt8(offsetRef.current);
        break;
      case 2:
        size = data.readUInt16LE(offsetRef.current);
        break;
      case 4:
        size = data.readUInt32LE(offsetRef.current);
        break;
      default:
      //
    }
    offsetRef.current += dataTypeSizeBytes;
  } else {
    size = getBits(flag, 0, 4);
  }

  return {
    type,
    size,
  };
}

export function DecodeTypedData(data: Buffer, offsetRef: Ref, type: number, size?: number): any {
  let value;

  switch (type) {
    case DataType.Binary:
    case DataType.BitString:
    case DataType.Byte:
      value = data.readUInt8(offsetRef.current);
      offsetRef.current += 1;
      break;
    case DataType.Integer:
      value = data.readInt16LE(offsetRef.current);
      offsetRef.current += 2;
      break;
    case DataType.Float:
      value = data.readFloatLE(offsetRef.current);
      offsetRef.current += 4;
      break;
    case DataType.Array: {
      value = [];
      const lastOffset = offsetRef.current + size!;
      const descriptor = DecodeDataDescriptor(data, offsetRef);
      while (offsetRef.current < lastOffset) {
        value.push(DecodeTypedData(data, offsetRef, descriptor.type!, descriptor.size));
      }
      break;
    }
    case DataType.Timer: {
      /** https://github.com/plcpeople/nodepccc/blob/13695b9a92762bb7cd1b8d3801d7abb1b797714e/nodePCCC.js#L2721 */
      const bits = data.readInt16LE(offsetRef.current);
      value = {
        EN: ((bits & (1 << 15)) > 0),
        TT: ((bits & (1 << 14)) > 0),
        DN: ((bits & (1 << 13)) > 0),
        PRE: data.readInt16LE(offsetRef.current + 2),
        ACC: data.readInt16LE(offsetRef.current + 4),
      };
      offsetRef.current += 6;
      break;
    }
    case DataType.Counter: {
      /** https://github.com/plcpeople/nodepccc/blob/13695b9a92762bb7cd1b8d3801d7abb1b797714e/nodePCCC.js#L2728 */
      const bits = data.readInt16LE(offsetRef.current);
      value = {
        CN: ((bits & (1 << 15)) > 0),
        CD: ((bits & (1 << 14)) > 0),
        DN: ((bits & (1 << 13)) > 0),
        OV: ((bits & (1 << 12)) > 0),
        UN: ((bits & (1 << 11)) > 0),
        PRE: data.readInt16LE(offsetRef.current + 2),
        ACC: data.readInt16LE(offsetRef.current + 4),
      };
      offsetRef.current += 6;
      break;
    }
    case DataType.Control: {
      /** https://github.com/plcpeople/nodepccc/blob/13695b9a92762bb7cd1b8d3801d7abb1b797714e/nodePCCC.js#L2737 */
      const bits = data.readInt16LE(offsetRef.current);
      value = {
        EN: ((bits & (1 << 15)) > 0),
        EU: ((bits & (1 << 14)) > 0),
        DN: ((bits & (1 << 13)) > 0),
        EM: ((bits & (1 << 12)) > 0),
        ER: ((bits & (1 << 11)) > 0),
        UL: ((bits & (1 << 10)) > 0),
        IN: ((bits & (1 << 9)) > 0),
        FD: ((bits & (1 << 8)) > 0),
        LEN: data.readInt16LE(offsetRef.current + 2),
        POS: data.readInt16LE(offsetRef.current + 4),
      };
      offsetRef.current += 6;
      break;
    }

    default:
      console.log(`PCCC Error: Unknown Type: ${type}`);
  }

  return value;
}

export function DecodeTypedReadResponse(data: Buffer, offsetRef: Ref) {
  const descriptor = DecodeDataDescriptor(data, offsetRef);
  return DecodeTypedData(data, offsetRef, descriptor.type!, descriptor.size);
}
