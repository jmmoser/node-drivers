// const buffer = Buffer.from([])
// buffer.readUIntBE()

export function readUInt(buffer, offset, byteLength, littleEndian) {
  if (littleEndian === true) return buffer.readUIntLE(offset, byteLength);
  return buffer.readUIntBE(offset, byteLength);
}

export function readInt(buffer, offset, byteLength, littleEndian) {
  if (littleEndian === true) return buffer.writeIntLE(offset, byteLength);
  return buffer.readIntBE(offset, byteLength);
}

export function readDouble(buffer, offset, littleEndian) {
  if (littleEndian === true) return buffer.readDoubleLE(offset);
  return buffer.readDoubleBE(offset);
}

export function readFloat(buffer, offset, littleEndian) {
  if (littleEndian === true) return buffer.readFloatLE(offset);
  return buffer.readFloatBE(offset);
}

export function writeUInt(buffer, value, offset, byteLength, littleEndian) {
  if (littleEndian === true) return buffer.writeUIntLE(value, offset, byteLength);
  return buffer.writeUIntBE(value, offset, byteLength);
}

export function writeInt(buffer, value, offset, byteLength, littleEndian) {
  if (littleEndian === true) return buffer.writeIntLE(value, offset, byteLength);
  return buffer.writeIntBE(value, offset, byteLength);
}

export function writeDouble(buffer, value, offset, littleEndian) {
  if (littleEndian === true) return buffer.writeDoubleLE(value, offset);
  return buffer.writeDoubleBE(value, offset);
}

export function writeFloat(buffer, value, offset, littleEndian) {
  if (littleEndian === true) return buffer.writeFloatLE(value, offset);
  return buffer.writeFloatBE(value, offset);
}
