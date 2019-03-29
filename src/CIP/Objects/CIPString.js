'use strict';

const CIP = require('./CIP');

function readString(type, buffer, offset) {
  offset = offset || 0;

  let index = 0;

  let length;
  let charLength;
  let readFunc;
  let convertFunc;

  let str = '';

  switch (type) {
    case CIP.DataType.STRING:
      charLength = 1;
      length = buffer.readUInt16LE(offset); offset += 2;
      readFunc = buffer.readUInt8;
      convertFunc = String.fromCharCode;
      break;
    case CIP.DataType.STRING2:
      charLength = 2;
      length = buffer.readUInt16LE(offset); offset += 2;
      readFunc = buffer.readUInt16LE;
      convertFunc = String.fromCharCode;
    case CIP.DataType.SHORT_STRING:
      charLength = 1;
      length = buffer.readUInt8(offset); offset += 1;
      readFunc = buffer.readUInt8;
      convertFunc = String.fromCharCode;
      break;
    case CIP.DataType.STRINGN:
      //
      break;
    case CIP.DataType.STRINGI:
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


module.exports = {
  readString
};