import {
  encodeUnsignedInteger,
  unsignedIntegerSize,
} from '../../utils.js';

import {
  DataType,
} from './constants.js';

import { logicalASCIIAddressInfo } from './shared.js';

import { Ref } from '../../types';

const CommandCodes = Object.freeze({
  Connected: 0x0A,
  Unconnected: 0x0B,
});

export function EncodeCommand(command: number, status: number, transaction: number, data?: Buffer) {
  const buffer = Buffer.allocUnsafe(4 + (data?.length || 0));
  buffer.writeUInt8(command, 0);
  buffer.writeUInt8(status, 1);
  buffer.writeUInt16LE(transaction, 2);
  if (data && data.length > 0) {
    data.copy(buffer, 4);
  }
  return buffer;
}

export function EncodeLogicalASCIIAddress(buffer: Buffer, offsetRef: Ref, address: string) {
  offsetRef.current = buffer.writeUInt8(0x00, offsetRef.current);
  offsetRef.current = buffer.writeUInt8(0x24, offsetRef.current);
  offsetRef.current += buffer.write(address, offsetRef.current, 'ascii');
  offsetRef.current = buffer.writeUInt8(0x00, offsetRef.current);
}

function dataTypeAttributeAdditionalEncodingLength(value: number) {
  if (value < 7) {
    return 0;
  }
  return unsignedIntegerSize(value);
}

export function DataTypeEncodingLength(id: number, size: number) {
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

export function EncodeDataDescriptor(data: Buffer, offsetRef: Ref, id: number, size: number) {
  const idLength = dataTypeAttributeAdditionalEncodingLength(id);
  const sizeLength = dataTypeAttributeAdditionalEncodingLength(size);

  if (idLength === 0 && sizeLength === 0) {
    offsetRef.current = data.writeUInt8((id << 4) | size, offsetRef.current);
    return;
  }

  if (idLength > 0 && sizeLength === 0) {
    offsetRef.current = data.writeUInt8(((0b1000 | idLength) << 4) | size, offsetRef.current);
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

export function EncodeTypedData(buffer, offsetRef, type, value) {
  switch (type) {
    case DataType.Binary:
    case DataType.Byte:
      offsetRef.current = buffer.writeUInt8(value, offsetRef.current);
      break;
    case 'INT':
    case DataType.Integer:
      offsetRef.current = buffer.writeInt16LE(value, offsetRef.current);
      break;
    case 'DINT':
      offsetRef.current = buffer.writeUInt32LE(value, offsetRef.current);
      break;
    case 'REAL':
    case DataType.Float:
      offsetRef.current = buffer.writeFloatLE(value, offsetRef.current);
      break;
    default:
      throw new Error(`Unable to encode value of type: ${type}`);
  }
}

/* ********* REQUESTS ********* */

export function EncodeDiagnosticStatus(transaction) {
  return EncodeCommand(0x06, 0, transaction, Buffer.from([0x03]));
}

export function EncodeEcho(transaction, data) {
  if (!Buffer.isBuffer(data)) {
    data = Buffer.allocUnsafe(0);
  }
  const buffer = Buffer.allocUnsafe(data.length + 1);
  buffer.writeUInt8(0, 0);
  data.copy(buffer, 1);
  return EncodeCommand(0x06, 0, transaction, buffer);
}

export function EncodeUnprotectedRead(transaction, address, size) {
  const buffer = Buffer.allocUnsafe(3);
  buffer.writeUInt16LE(address, 0);
  buffer.writeUInt8(size, 2);
  return EncodeCommand(0x01, 0, transaction, buffer);
}

/**
 * Supported Processors
 * - 1774-PLC
 * - PLC-2
 * - PLC-3
 * - PLC-5
 * - SLC 500
 * - MicroLogix 1000
*/
export function EncodeUnprotectedWrite(transaction, address, writeData) {
  const buffer = Buffer.allocUnsafe(2 + writeData.length);
  buffer.writeUInt16LE(address, 0);
  writeData.copy(buffer, 2);
  return EncodeCommand(0x08, 0, transaction, buffer);
}

/**
 * Supported Processors
 * - PLC-5
 * - PLC-5/VME
 */
export function EncodeUploadAllRequest(transaction) {
  return EncodeCommand(0x0F, 0, transaction, Buffer.from([0x53]));
}

export function EncodeUploadCompleted(transaction) {
  return new EncodeCommand(0x0F, 0, transaction, Buffer.from([0x55]));
}

/**
 * Supported Processors
 * - PLC-3
 */
export function EncodeUpload(transaction) {
  return EncodeCommand(0x0F, 0, transaction, Buffer.from([0x06]));
}

export function EncodeTypedRead(transaction, address, items) {
  // const info = logicalASCIIAddressInfo(address);
  // if (!info) {
  //   throw new Error(`Unsupported address: ${address}`);
  // }

  const offsetRef = { current: 0 };
  const data = Buffer.allocUnsafe(10 + address.length);
  offsetRef.current = data.writeUInt8(0x68, offsetRef.current); // function
  offsetRef.current = data.writeUInt16LE(0, offsetRef.current); /** Packet offset */
  // offset = data.writeUInt16LE((items * info.size / 2) + 1, offset); // Total Trans
  offsetRef.current = data.writeUInt16LE(items, offsetRef.current); // Total Trans
  EncodeLogicalASCIIAddress(data, offsetRef, address);
  offsetRef.current = data.writeUInt16LE(items, offsetRef.current); // Number of elements to read
  return EncodeCommand(0x0F, 0, transaction, data);
}

export function EncodeTypedWrite(transaction, address, values) {
  const info = logicalASCIIAddressInfo(address);
  if (!info) {
    throw new Error(`Unsupported address: ${address}`);
  }

  const valueCount = values.length;
  const dataValueLength = valueCount * info.size;
  const dataTypeLength = DataTypeEncodingLength(info.id, info.size);
  const dataLength = 5 + (address.length + 3) + dataTypeLength + dataValueLength;

  const offsetRef = { current: 0 };
  const data = Buffer.allocUnsafe(dataLength);
  offsetRef.current = data.writeUInt8(0x67, offsetRef.current); /** function */
  offsetRef.current = data.writeUInt16LE(0, offsetRef.current); /** Packet offset */
  offsetRef.current = data.writeUInt16LE(valueCount, offsetRef.current); /** total transmitted */
  EncodeLogicalASCIIAddress(data, offsetRef, address);

  EncodeDataDescriptor(data, offsetRef, info.id, info.size);

  for (let i = 0; i < valueCount; i++) {
    EncodeTypedData(data, offsetRef, info.datatype, values[i]);
  }

  return EncodeCommand(0x0F, 0, transaction, data);
}

export function EncodeWordRangeReadRequest(transaction, address, words) {
  const info = logicalASCIIAddressInfo(address);
  if (!info) {
    throw new Error(`Unsupported address: ${address}`);
  }

  const offsetRef = { current: 0 };
  const data = Buffer.allocUnsafe(9 + address.length);
  offsetRef.current = data.writeUInt8(0x01, offsetRef.current); // Function

  /**
   * PACKET OFFSET
   * Contains the offset in words from the address in the in the address field.
   * For example, if the previous command read the maximum 244 bytes, the next
   * offset should be 122.
   */
  offsetRef.current = data.writeUInt16LE(0, offsetRef.current);

  /**
   * TOTAL TRANSACTION
   * Indicates the total amount of PLC-3 data table words (low byte first)
   * that are transferred for the entire transaction.
   */
  offsetRef.current = data.writeUInt16LE(words, offsetRef.current);

  /**
   * ADDRESS
   */
  EncodeLogicalASCIIAddress(data, offsetRef, address);

  /**
   * SIZE
   * Specifies how many bytes of PLC-3 data table information you read in this transaction.
   * The word range read command reads a maximum of 244 bytes per message packet.
   */
  const size = 2 * words;
  if (size > 244) {
    throw new Error(`Maximum size of a single word range read transaction is 244. Received: ${size}`);
  }

  offsetRef.current = data.writeUInt8(size, offsetRef.current);

  return EncodeCommand(0x0F, 0, transaction, data);
}

/** Documentation: CIP and PCCC v1 */
export function EncodeUnconnectedRequest(transaction, data) {
  const buffer = Buffer.allocUnsafe(2 + data.length);
  buffer.writeUInt8(0, 0); // FNC
  buffer.writeUInt8(0, 1); // Extra
  data.copy(buffer, 2);
  return EncodeCommand(CommandCodes.Unconnected, 0, transaction, buffer);
}

/** Documentation: CIP and PCCC v1 */
export function EncodeConnectedRequest(transaction, connectionID, transportHeader, data) {
  const buffer = Buffer.allocUnsafe(6 + data.length);
  buffer.writeUInt8(0, 0); // FNC
  buffer.writeUInt8(0, 1); // Extra
  buffer.writeUInt16LE(connectionID, 2);
  buffer.writeUInt16LE(transportHeader, 4);
  data.copy(buffer, 6);
  return EncodeCommand(CommandCodes.Connected, 0, transaction, data);
}
