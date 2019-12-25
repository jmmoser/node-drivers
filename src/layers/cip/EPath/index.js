'use strict';

const { getBits } = require('../../../utils');
const Segments = require('./segments');


class EPath {
  constructor(padded, segments) {
    this.padded = padded;
    this.segments = segments;
  }

  encodeSize() {
    return encodeSize(this.padded, this.segments);
  }


  /**
   * CIP Vol 1 Appendix C-1.4.5.2
   * 
   * symbol
   * symbol.symbol
   * symbol[member]
   * symbol[member].symbol
   * symbol[member,member]
   */
  static ConvertSymbolToSegments(fullSymbol) {
    const segments = [];
    const symbols = fullSymbol.split('.');

    for (let i = 0; i < symbols.length; i++) {
      const symbol = symbols[i];
      const symbolAndMembers = symbol.split('[');
      const symbolName = symbolAndMembers[0];

      segments.push(new Segments.Data.ANSIExtendedSymbol(symbolName));

      if (symbolAndMembers.length > 1) {
        const membersStringWithBracket = symbolAndMembers[1];
        if (membersStringWithBracket.indexOf(']') !== membersStringWithBracket.length - 1) {
          throw new Error(`Invalid symbol name`);
        }

        const members = membersStringWithBracket.substring(0, membersStringWithBracket.length - 1).split(',');

        for (let j = 0; j < members.length; j++) {
          segments.push(new Segments.Logical.MemberID(parseInt(members[j], 10)));
        }
      }
    }

    return segments;
  }
  

  static Decode(buffer, offset, length, padded, cb) {
    if (length === true) {
      length = buffer.length - offset;
    }

    const lengthIsUnknown = length == null;
    if (lengthIsUnknown) {
      /** Allow length to be unknown? Assume a single segment */
      length = 1;
    }
    const startingOffset = offset;
    const segments = [];
    while (offset - startingOffset < length) {
      const segmentCode = buffer.readUInt8(offset); offset += 1;
      const segmentType = getBits(segmentCode, 5, 8);
      
      switch (segmentType) {
        case 0:
          offset = Segments.Port.Decode(segmentCode, buffer, offset, padded, val => segments.push(val));
          break;
        case 1:
          offset = Segments.Logical.Decode(segmentCode, buffer, offset, padded, val => segments.push(val));
          break;
        case 2:
          offset = Segments.Network.Decode(segmentCode, buffer, offset, padded, val => segments.push(val));
          break;
        case 3:
          offset = Segments.Symbolic.Decode(segmentCode, buffer, offset, padded, val => segments.push(val));
          break;
        case 4:
          offset = Segments.Data.Decode(segmentCode, buffer, offset, padded, val => segments.push(val));
          break;
        case 5:
        case 6:
          throw new Error(`Use datatypes/decoding instead of EPath`);
          // offset = Segments.DataType.Decode(segmentCode, buffer, offset, padded, val => segments.push(val));
          // break;
        default:
          throw new Error(`Unexpected segment: ${segmentType}`);
      }
    }

    if (typeof cb === 'function') {
      if (segments.length === 0) {
        console.log(arguments);
        console.log(new Error())
      }
      if (lengthIsUnknown && segments.length === 1) {
        cb(segments[0]);
      } else {
        cb(segments);
      }
    }

    return offset;
  }


  static EncodeSize(padded, segments) {
    return encodeSize(padded, segments);
  }

  static Encode(padded, segments) {
    let size = 0;
    for (let i = 0; i < segments.length; i++) {
      size += segments[i].encodeSize(padded);
    }
    const buffer = Buffer.alloc(size);
    EncodeTo(buffer, 0, padded, segments);
    return buffer;
  }

  static EncodeTo(buffer, offset, padded, segments) {
    return EncodeTo(buffer, offset, padded, segments);
  }
}


EPath.Segments = Segments;

module.exports = EPath;


function encodeSize(padded, segments) {
  if (!Array.isArray(segments)) {
    throw new Error(`Segments must be an array. Received: ${typeof segments}`);
  }
  let size = 0;
  for (let i = 0; i < segments.length; i++) {
    size += segments[i].encodeSize(padded);
  }
  return size;
}


function EncodeTo(buffer, offset, padded, segments) {
  if (!Array.isArray(segments)) {
    throw new Error(`Segments must be an array. Received: ${typeof segments}`);
  }
  for (let i = 0; i < segments.length; i++) {
    offset = segments[i].encodeTo(buffer, offset, padded);
  }
  return offset;
}