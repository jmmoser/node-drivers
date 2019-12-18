'use strict';

/**
 * CIP Vol 1, Appendix C-1.4.4
 * 
 * The symbolic segment contains an International String symbol which must be
 * interpreted by the device.
 */

const {
  getBit,
  getBits,
  InvertKeyValues
} = require('../../../../../utils');

// const NetworkSegmentTypeCodes = {
//   Schedule: 1,
//   FixedTag: 2,
//   ProductionInhibitTime: 3,
//   Safety: 16,
//   Extended: 31
// };

// const NetworkSegmentTypeNamzx es = InvertKeyValues(NetworkSegmentTypeCodes);


const ExtendedStringFormatCodes = {
  DoubleByteCharacters: 1,
  TripleByteCharacters: 2,
  Numeric: 6
};


class SymbolicSegment {
  static Decode(buffer, offset, padded, cb) {
    const segmentCode = buffer.readUInt8(offset); offset += 1;

    if (getBits(segmentCode, 5, 8) !== 3) {
      throw new Error(`Not a symbolic segment: ${segmentCode}`);
    }

    const symbolSize = getBits(segmentCode, 0, 5);

    let value;
    if (symbolSize === 0) {
      const extendedFormatCode = buffer.readUInt8(offset); offset += 1;
      const format = getBits(extendedFormatCode, 5, 8);
      const size = getBits(extendedFormatCode, 0, 5);

      switch (format) {
        case ExtendedStringFormatCodes.DoubleByteCharacters:
          value = buffer.toString('utf16le', offset, offset + 2 * size); offset += 2 * size;
          break;
        case ExtendedStringFormatCodes.TripleByteCharacters:
          value = buffer.toString('utf16le', offset, offset + 3 * size); offset += 3 * size;
          break;
        case ExtendedStringFormatCodes.Numeric: {
          switch (size) {
            case 6:
              value = buffer.readUInt8(offset); offset += 1;
              break;
            case 7:
              value = buffer.readUInt16LE(offset); offset += 2;
              break;
            case 8:
              value = buffer.readUInt32LE(offset); offset += 4;
              break;
            default:
              throw new Error(`Symbol segment numeric format reserved: ${size}`);
          }
          break;
        }
        default:
          throw new Error(`Symbol segment unknown format: ${format}`);
      }
    } else {
      value = buffer.toString('ascii', offset, offset + symbolSize); offset += symbolSize;
    }

    if (typeof cb === 'function') {
      cb({
        value
      });
    }

    return offset;
  }
}

module.exports = SymbolicSegment;