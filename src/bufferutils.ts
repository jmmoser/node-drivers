import { Ref } from './types';

export function readUInt(buffer: Buffer, offset: number, byteLength: number, littleEndian: boolean) {
  if (littleEndian === true) return buffer.readUIntLE(offset, byteLength);
  return buffer.readUIntBE(offset, byteLength);
}

export function readInt(buffer: Buffer, offset: number, byteLength: number, littleEndian: boolean) {
  if (littleEndian === true) return buffer.readIntLE(offset, byteLength);
  return buffer.readIntBE(offset, byteLength);
}

export function readDouble(buffer: Buffer, offset: number, littleEndian: boolean) {
  if (littleEndian === true) return buffer.readDoubleLE(offset);
  return buffer.readDoubleBE(offset);
}

export function readFloat(buffer: Buffer, offset: number, littleEndian: boolean) {
  if (littleEndian === true) return buffer.readFloatLE(offset);
  return buffer.readFloatBE(offset);
}

export function writeUInt(buffer: Buffer, value: number, offset: number, byteLength: number, littleEndian: boolean) {
  if (littleEndian === true) return buffer.writeUIntLE(value, offset, byteLength);
  return buffer.writeUIntBE(value, offset, byteLength);
}

export function writeInt(buffer: Buffer, value: number, offset: number, byteLength: number, littleEndian: boolean) {
  if (littleEndian === true) return buffer.writeIntLE(value, offset, byteLength);
  return buffer.writeIntBE(value, offset, byteLength);
}

export function writeDouble(buffer: Buffer, value: number, offset: number, littleEndian: boolean) {
  if (littleEndian === true) return buffer.writeDoubleLE(value, offset);
  return buffer.writeDoubleBE(value, offset);
}

export function writeFloat(buffer: Buffer, value: number, offset: number, littleEndian: boolean) {
  if (littleEndian === true) return buffer.writeFloatLE(value, offset);
  return buffer.writeFloatBE(value, offset);
}
