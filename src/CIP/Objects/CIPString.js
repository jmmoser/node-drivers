'use strict';

const CODES = require(__dirname + '/constants/ElementaryDataTypes');

function readString(type, buffer, offset) {
  offset = offset || 0;

  let index = 0;

  let length;
  let charLength;
  let readFunc;
  let convertFunc;

  let str = '';

  switch (type) {
    case CODES.DataType.STRING:
      charLength = 1;
      length = buffer.readUInt16LE(offset); offset += 2;
      readFunc = buffer.readUInt8;
      convertFunc = String.fromCharCode;
      break;
    case CODES.DataType.STRING2:
      charLength = 2;
      length = buffer.readUInt16LE(offset); offset += 2;
      readFunc = buffer.readUInt16LE;
      convertFunc = String.fromCharCode;
    case CODES.DataType.SHORT_STRING:
      charLength = 1;
      length = buffer.readUInt8(offset); offset += 1;
      readFunc = buffer.readUInt8;
      convertFunc = String.fromCharCode;
      break;
    case CODES.DataType.STRINGN:
      //
      break;
    case CODES.DataType.STRINGI:
      //
      break;
    default:

  }

  while (offset + index < length - charLength) {
    str += convertFunc(readFunc(offset));
    offset += charLength;
  }

  return str;
}
