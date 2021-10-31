import { getBits } from '../../../utils.js';
import Segments from './segments/index.js';

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
          throw new Error('Invalid symbol name');
        }

        const members = membersStringWithBracket.substring(0, membersStringWithBracket.length - 1).split(',');

        for (let j = 0; j < members.length; j++) {
          segments.push(new Segments.Logical.MemberID(parseInt(members[j], 10)));
        }
      }
    }

    return segments;
  }

  static Decode(buffer, offsetRef, length, padded) {
    if (length === true) {
      length = buffer.length - offsetRef.current; // eslint-disable-line no-param-reassign
    }

    const lengthIsUnknown = length == null;
    if (lengthIsUnknown) {
      /** Allow length to be unknown? Assume a single segment */
      length = 1; // eslint-disable-line no-param-reassign
    }

    const startingOffset = offsetRef.current;
    const segments = [];
    while (offsetRef.current - startingOffset < length) {
      const code = buffer.readUInt8(offsetRef.current); offsetRef.current += 1;
      const segmentType = getBits(code, 5, 8);
      let segment;

      switch (segmentType) {
        case 0:
          segment = Segments.Port.Decode(buffer, offsetRef, code, padded);
          break;
        case 1:
          segment = Segments.Logical.Decode(buffer, offsetRef, code, padded);
          break;
        case 2:
          segment = Segments.Network.Decode(buffer, offsetRef, code, padded);
          break;
        case 3:
          segment = Segments.Symbolic.Decode(buffer, offsetRef, code, padded);
          break;
        case 4:
          segment = Segments.Data.Decode(buffer, offsetRef, code, padded);
          break;
        case 5:
        case 6:
          segment = Segments.DataType.Decode(buffer, offsetRef, code, padded);
          break;
        default:
          throw new Error(`Unexpected segment: ${segmentType}`);
      }
      segments.push(segment);
    }

    if (lengthIsUnknown && segments.length === 1) {
      return segments[0];
    }

    return segments;
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

export default EPath;
