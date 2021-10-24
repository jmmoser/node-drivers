const {
  encodeUnsignedInteger,
  unsignedIntegerSize,
} = require('../../utils');

const {
  PCCCDataType,
} = require('./constants');

function EncodeCommand(command, status, transaction, data = []) {
  const buffer = Buffer.allocUnsafe(4 + data.length);
  buffer.writeUInt8(command, 0);
  buffer.writeUInt8(status, 1);
  buffer.writeUInt16LE(transaction, 2);
  if (data.length > 0) {
    data.copy(buffer, 4);
  }
  return buffer;
}

function EncodeLogicalASCIIAddress(buffer, offsetRef, address) {
  offsetRef.current = buffer.writeUInt8(0x00, offsetRef.current);
  offsetRef.current = buffer.writeUInt8(0x24, offsetRef.current);
  offsetRef.current += buffer.write(address, offsetRef.current, 'ascii');
  offsetRef.current = buffer.writeUInt8(0x00, offsetRef.current);
}

function dataTypeAttributeAdditionalEncodingLength(value) {
  if (value < 7) {
    return 0;
  }
  return unsignedIntegerSize(value);
}

function DataTypeEncodingLength(id, size) {
  const idLength = dataTypeAttributeAdditionalEncodingLength(id);
  const sizeLength = dataTypeAttributeAdditionalEncodingLength(size);

  if (idLength === 0 && sizeLength === 0) {
    return 1;
  }

  if (idLength > 0 && sizeLength === 0) {
    return 1 + idLength;
  }

  if (idLength === 0 && sizeLength > 0) {
    return 1 + sizeLength;
  }

  if (idLength > 0 && sizeLength > 0) {
    return 1 + idLength + sizeLength;
  }

  throw new Error(`Unable to encode data type with id ${id} and size ${size}`);
}

function EncodeDataDescriptor(data, offsetRef, id, size) {
  const idLength = dataTypeAttributeAdditionalEncodingLength(id);
  const sizeLength = dataTypeAttributeAdditionalEncodingLength(size);

  if (idLength === 0 && sizeLength === 0) {
    offsetRef.current = data.writeUInt8((id << 4) | size, offsetRef.current);
    return;
  }

  if (idLength > 0 && sizeLength === 0) {
    offsetRef.current = data.writeUInt8(((0b1000 | idLength) << 4) | size, offsetRef);
    offsetRef.current = encodeUnsignedInteger(data, offsetRef.current, id, idLength);
    return;
  }

  if (idLength === 0 && sizeLength > 0) {
    offsetRef.current = data.writeUInt8((id << 4) | (0b1000 | sizeLength), offsetRef.current);
    offsetRef.current = encodeUnsignedInteger(data, offsetRef.current, size, sizeLength);
    return;
  }

  if (idLength > 0 && sizeLength > 0) {
    offsetRef.current = data.writeUInt8(
      ((0b1000 | idLength) << 4) | (0b1000 | sizeLength),
      offsetRef.current,
    );
    offsetRef.current = encodeUnsignedInteger(data, offsetRef.current, id, idLength);
    offsetRef.current = encodeUnsignedInteger(data, offsetRef.current, size, sizeLength);
    return;
  }

  throw new Error(`Unable to encode data type with id ${id} and size ${size}`);
}

function EncodeTypedData(buffer, offsetRef, type, value) {
  switch (type) {
    case PCCCDataType.Binary:
    case PCCCDataType.Byte:
      offsetRef.current = buffer.writeUInt8(value, offsetRef.current);
      break;
    case 'INT':
    case PCCCDataType.Integer:
      offsetRef.current = buffer.writeInt16LE(value, offsetRef.current);
      break;
    case 'DINT':
      offsetRef.current = buffer.writeUInt32LE(value, offsetRef.current);
      break;
    case 'REAL':
    case PCCCDataType.Float:
      offsetRef.current = buffer.writeFloatLE(value, offsetRef.current);
      break;
    default:
      throw new Error(`Unable to encode value of type: ${type}`);
  }
}

module.exports = {
  EncodeCommand,
  EncodeLogicalASCIIAddress,
  EncodeDataDescriptor,
  EncodeTypedData,
  DataTypeEncodingLength,
};
