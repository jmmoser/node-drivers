import {
  Functions,
  ErrorDescriptions,
} from './constants';

import { writeUInt, readUInt } from '../../bufferutils';
import { Ref } from '../../types';

const OFFSET_FN = 0;
const OFFSET_DATA = 1;

// /** this needs to be improved */
// const HoldingRegisterAddressRegex = /^0?4\d{4,5}/;

/**
 * holding register numbers start with 4 and span from 40001 to 49999.
 */
// TODO
// function parseAddressingInput(fn, input) {
//   return {
//     address: parseInt(input, 10),
//   };
// }

export type ModbusValues = Buffer | Buffer[] | number[];

export default class PDU {
  static EncodeReadRequest(fn: number, address: number, count: number, littleEndian: boolean) {
    const buffer = Buffer.allocUnsafe(5);
    buffer.writeUInt8(fn, 0);
    writeUInt(buffer, address, 1, 2, littleEndian);
    writeUInt(buffer, count, 3, 2, littleEndian);
    return buffer;
  }

  static EncodeWriteRequest(fn: number, address: number, values: ModbusValues, littleEndian: boolean) {
    let buffer;
    if (Buffer.isBuffer(values)) {
      buffer = Buffer.allocUnsafe(3 + values.length);
      buffer.writeUInt8(fn, 0);
      writeUInt(buffer, address, 1, 2, littleEndian);
      values.copy(buffer, 3);
    } else if (Array.isArray(values)) {
      buffer = Buffer.allocUnsafe(3 + 2 * values.length);
      buffer.writeUInt8(fn, 0);
      writeUInt(buffer, address, 1, 2, littleEndian);
      for (let i = 0; i < values.length; i++) {
        const value = values[i];
        const offset = 2 * i + 3;
        if (Buffer.isBuffer(value) && value.length === 2) {
          value.copy(buffer, offset, 0, 2);
        } else if (Number.isFinite(value)) {
          writeUInt(buffer, value as number, offset, 2, littleEndian);
        } else {
          throw new Error('Modbus write request error: currently supports buffer, array of 2-byte buffers, or array of finite numbers');
        }
      }
    } else {
      throw new Error('Modbus write request error: currently supports buffer, array of 2-byte buffers, or array of finite numbers');
    }

    return buffer;
  }

  static Decode(buffer: Buffer, offsetRef: Ref, pduLength: number, littleEndian: boolean) {
    const fn = PDU.Fn(buffer, offsetRef);
    const data = PDU.Data(buffer, offsetRef, pduLength);

    let error;
    let value;
    if (fn > 0x80) {
      const errorCode = data.readUInt8(0);
      error = {
        code: errorCode,
        message: (ErrorDescriptions as any)[errorCode] || 'Unknown error',
      };
    } else {
      switch (fn) {
        case Functions.ReadCoils:
        case Functions.ReadDiscreteInputs: {
          value = [];
          const dataLength = buffer.readUInt8(offsetRef.current + OFFSET_DATA);
          offsetRef.current += 1;
          for (let i = 0; i < dataLength; i++) {
            value.push(buffer.readUInt8(offsetRef.current + OFFSET_DATA + i));
          }
          offsetRef.current += dataLength;
          break;
        }
        case Functions.ReadHoldingRegisters:
        case Functions.ReadInputRegisters: {
          value = [];
          const dataLength = buffer.readUInt8(offsetRef.current + OFFSET_DATA);
          offsetRef.current += 1;
          const count = dataLength / 2;
          for (let i = 0; i < count; i++) {
            value.push(readUInt(buffer, offsetRef.current + OFFSET_DATA + 2 * i, 2, littleEndian));
          }
          offsetRef.current += dataLength;
          break;
        }
        case Functions.WriteSingleCoil:
        case Functions.WriteSingleHoldingRegister: {
          const address = readUInt(buffer, offsetRef.current + OFFSET_DATA, 2, littleEndian);
          const ivalue = readUInt(buffer, offsetRef.current + OFFSET_DATA + 2, 2, littleEndian);
          offsetRef.current += 4;
          value = {
            address,
            value: ivalue,
          };
          break;
        }
        case Functions.WriteMultipleCoils:
        case Functions.WriteMultipleHoldingRegisters: {
          const address = readUInt(buffer, offsetRef.current + OFFSET_DATA, 2, littleEndian);
          const count = readUInt(buffer, offsetRef.current + OFFSET_DATA + 2, 2, littleEndian);
          offsetRef.current += 4;
          value = {
            address,
            count,
          };
          break;
        }
        default:
          console.log(`Unsupported modbus fn response: ${fn}`);
      }
    }

    return {
      fn: {
        code: fn,
        name: Functions[fn & 0x7F] || 'Unknown',
      },
      data,
      error,
      value,
    };
  }

  static Fn(buffer: Buffer, offsetRef: Ref) {
    return buffer.readUInt8(offsetRef.current + OFFSET_FN);
  }

  static Data(buffer: Buffer, offsetRef: Ref, pduLength: number) {
    if (pduLength > 0) {
      return buffer.slice(offsetRef.current + OFFSET_DATA, offsetRef.current + pduLength);
    }
    return buffer.slice(offsetRef.current + OFFSET_DATA);
  }
}
