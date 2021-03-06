'use strict';

/**
 * CIP Vol 1, Appendix C-1.4.4
 * 
 * The symbolic segment contains an International String symbol which must be
 * interpreted by the device.
 */

const {
  getBits,
  unsignedIntegerSize
} = require('../../../../../utils');


const ExtendedStringFormatCodes = Object.freeze({
  DoubleByteCharacters: 1,
  TripleByteCharacters: 2,
  Numeric: 6
});

const ExtendedStringNumericTypeCodes = Object.freeze({
  USINT: 6,
  UINT: 7,
  UDINT: 8
});


class SymbolicSegment {
  constructor(value, extendedFormat, extendedSize) {
    if (extendedSize == null) {
      switch (extendedFormat) {
        case ExtendedStringFormatCodes.DoubleByteCharacters:
          if (Buffer.isBuffer(value)) {
            extendedSize = value.length / 2;
          } else if (typeof value === 'string') {
            extendedSize = value.length;
          }
          break;
        case ExtendedStringFormatCodes.TripleByteCharacters:
          if (Buffer.isBuffer(value)) {
            extendedSize = value.length / 3;
          } else if (typeof value === 'string') {
            extendedSize = value.length;
          }
          break;
        case ExtendedStringFormatCodes.Numeric: {
          switch (unsignedIntegerSize(value)) {
            case 1:
              extendedSize = ExtendedStringNumericTypeCodes.USINT;
              break;
            case 2:
              extendedSize = ExtendedStringNumericTypeCodes.UINT;
              break;
            case 4:
              extendedSize = ExtendedStringNumericTypeCodes.UDINT;
              break;
            default:
              break;
          }
          break;
        }
        default:
          break;
      }
    }

    validate(value, extendedFormat, extendedSize);
    this.extendedFormat = extendedFormat;
    this.extendedSize = extendedSize;
    this.value = value;
  }

  encodeSize() {
    switch (this.extendedFormat) {
      case ExtendedStringFormatCodes.DoubleByteCharacters:
        return 2 + 2 * this.extendedSize;
      case ExtendedStringFormatCodes.TripleByteCharacters:
        return 2 + 3 * this.extendedSize;
      case ExtendedStringFormatCodes.Numeric: {
        switch (this.extendedSize) {
          case ExtendedStringNumericTypeCodes.USINT:
            return 3;
          case ExtendedStringNumericTypeCodes.UINT:
            return 4;
          case ExtendedStringNumericTypeCodes.UDINT:
            return 6;
          default:
            throw new Error(`Invalid Port Segment Extended String Format Numeric size ${this.extendedSize}`);
        }
      }
      default:
        return 1 + this.value.length;
    }
  }

  encode() {
    const buffer = Buffer.alloc(this.encodeSize());
    this.encodeTo(buffer, 0);
    return buffer;
  }

  encodeTo(buffer, offset) {
    if (buffer.length - offset < this.encodeSize()) {
      throw new Error(`Buffer to encode symbolic segment is not large enough`);
    }

    let code = 0b01100000;
    if (this.extendedFormat == null) {
      code |= (this.value.length & 0b11111);
    }
    offset = buffer.writeUInt8(code, offset);

    if (this.extendedFormat == null) {
      if (Buffer.isBuffer(this.value)) {
        offset += this.value.copy(buffer, offset);
      } else {
        offset += buffer.write(this.value, offset, 'ascii');
      }
    } else {
      offset = buffer.writeUInt8(((this.extendedFormat & 0b111) << 5) | (this.extendedSize & 0b11111), offset);
      switch (this.extendedFormat) {
        case ExtendedStringFormatCodes.DoubleByteCharacters:
          this.value.copy(buffer, offset);
          offset += 2 * this.extendedSize;
          break;
        case ExtendedStringFormatCodes.TripleByteCharacters:
          this.value.copy(buffer, offset);
          offset += 3 * this.extendedSize;
          break;
        case ExtendedStringFormatCodes.Numeric: {
          switch (this.extendedSize) {
            case ExtendedStringNumericTypeCodes.USINT:
              offset = buffer.writeUInt8(this.value, offset);
              break;
            case ExtendedStringNumericTypeCodes.UINT:
              offset = buffer.writeUInt16LE(this.value, offset);
              break;
            case ExtendedStringNumericTypeCodes.UDINT:
              offset = buffer.writeUInt32LE(this.value, offset);
              break;
            default:
              break;
          }
          break;
        }
        default:
          break;
      }
    }
    
    return offset;
  }


  static Decode(segmentCode, buffer, offset, padded, cb) {
    let value, extendedFormat, extendedSize;
    const size = getBits(segmentCode, 0, 5);

    if (size === 0) {
      const extendedFormatCode = buffer.readUInt8(offset); offset += 1;
      extendedFormat = getBits(extendedFormatCode, 5, 8);
      extendedSize = getBits(extendedFormatCode, 0, 5);

      switch (extendedFormat) {
        case ExtendedStringFormatCodes.DoubleByteCharacters:
          value = buffer.slice(offset, offset + 2 * extendedSize); offset += 2 * extendedSize;
          // value = buffer.toString('utf16le', offset, offset + 2 * extendedSize); offset += 2 * extendedSize;
          break;
        case ExtendedStringFormatCodes.TripleByteCharacters:
          value = buffer.slice(offset, offset + 3 * extendedSize); offset += 3 * extendedSize;
          // value = buffer.toString('utf16le', offset, offset + 3 * extendedSize); offset += 3 * extendedSize;
          break;
        case ExtendedStringFormatCodes.Numeric: {
          switch (extendedSize) {
            case ExtendedStringNumericTypeCodes.USINT:
              value = buffer.readUInt8(offset); offset += 1;
              break;
            case ExtendedStringNumericTypeCodes.UINT:
              value = buffer.readUInt16LE(offset); offset += 2;
              break;
            case ExtendedStringNumericTypeCodes.UDINT:
              value = buffer.readUInt32LE(offset); offset += 4;
              break;
            default:
              throw new Error(`Symbol segment numeric format reserved: ${extendedSize}`);
          }
          break;
        }
        default:
          throw new Error(`Symbol segment unknown extended string format: ${extendedFormat}`);
      }
    } else {
      value = buffer.toString('ascii', offset, offset + size); offset += size;
    }

    if (typeof cb === 'function') {
      switch (extendedFormat) {
        case ExtendedStringFormatCodes.DoubleByteCharacters:
          cb(new SymbolicSegment.Double(value));
          break;
        case ExtendedStringFormatCodes.TripleByteCharacters:
          cb(new SymbolicSegment.Triple(value, extendedSize));
          break;
        case ExtendedStringFormatCodes.Numeric:
          cb(new SymbolicSegment.Numeric(value, extendedSize));
          break;
        default:
          cb(new SymbolicSegment.Single(value, extendedSize));
      }
    }

    return offset;
  }
}


SymbolicSegment.Single = class SingleByteSymbolicSegment extends SymbolicSegment {
  constructor(value) {
    super(value);
  }
}

SymbolicSegment.Double = class DoubleByteSymbolicSegment extends SymbolicSegment {
  constructor(value, extendedSize) {
    super(value, ExtendedStringFormatCodes.DoubleByteCharacters, extendedSize);
  }
}

SymbolicSegment.Triple = class TripleByteSymbolicSegment extends SymbolicSegment {
  constructor(value, extendedSize) {
    super(value, ExtendedStringFormatCodes.TripleByteCharacters, extendedSize);
  }
}

SymbolicSegment.Numeric = class NumericByteSymbolicSegment extends SymbolicSegment {
  constructor(value, extendedSize) {
    super(value, ExtendedStringFormatCodes.Numeric, extendedSize);
  }
}

module.exports = SymbolicSegment;


function validate(value, extendedFormat, extendedSize) {
  if (extendedFormat == null) {
    if (typeof value !== 'string' && !Buffer.isBuffer(value)) {
      throw new Error(`Non-extended Symbol segment value must be a string or buffer. Received ${value}`);
    }

    if (value.length < 1 || value.length > 31) {
      throw new Error(`Non-extended Symbol segment value length must be between 1 and 31. Received ${value.length}`)
    }
  } else {
    switch (extendedFormat) {
      case ExtendedStringFormatCodes.DoubleByteCharacters: {
        if (!Buffer.isBuffer(value)) {
          throw new Error(`Double-Byte Character Symbol Segment value must be a buffer`);
        }
        if (value.length !== 2 * extendedSize) {
          throw new Error(`Double-Byte Character Symbol Segment value length does not match extended size`);
        }
        break;
      }
      case ExtendedStringFormatCodes.TripleByteCharacters: {
        if (!Buffer.isBuffer(value)) {
          throw new Error(`Triple-Byte Character Symbol Segment value must be a buffer`);
        }
        if (value.length !== 3 * extendedSize) {
          throw new Error(`Triple-Byte Character Symbol Segment value length does not match extended size`);
        }
        break;
      }
      case ExtendedStringFormatCodes.Numeric: {
        if (!Number.isInteger(value)) {
          throw new Error(`Numeric Symbol Segment value must be an integer`);
        }
        switch (extendedSize) {
          case ExtendedStringNumericTypeCodes.USINT:
            if (value < 0 || value > 0xFF) {
              throw new Error(`USINT Numeric Symbol Segment value must be an integer between 0 and 255`);
            }
            break;
          case ExtendedStringNumericTypeCodes.UINT:
            if (value < 0 || value > 0xFFFF) {
              throw new Error(`USINT Numeric Symbol Segment value must be an integer between 0 and 65535`);
            }
            break;
          case ExtendedStringNumericTypeCodes.UDINT:
            if (value < 0 || value > 0xFFFFFFFF) {
              throw new Error(`USINT Numeric Symbol Segment value must be an integer between 0 and 4294967295`);
            }
            break;
          default:
            throw new Error(`Invalid extended size`);
        }
        break;
      }
      default:
        throw new Error('Invalid extended format');
    }
  }
}