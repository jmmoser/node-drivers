/**
 * CIP Vol 1, Appendix C-1.4.5
 *
 * The data segment provides a mechanism for delivering data to an application. This may occur
 * during connection establishment, or at any other time as defined by the application.
 */

import {
  getBits,
} from '../../../../utils.js';

const SubtypeCodes = Object.freeze({
  Simple: 0,
  ANSIExtendedSymbol: 17,
});

function validate(subtype, value) {
  switch (subtype) {
    case SubtypeCodes.Simple:
      if (!Buffer.isBuffer(value)) {
        throw new Error(`Simple Data Segment value must be a buffer. Received ${value}`);
      }
      if (value.length % 2 !== 0) {
        throw new Error(`Length of Simple Data Segment value must be even. Received ${value.length}`);
      }
      break;
    case SubtypeCodes.ANSIExtendedSymbol:
      if (typeof value !== 'string') {
        throw new Error(`ANSI Extended Symbol Data Segment value must be a string. Received ${value}`);
      }
      if (value.length === 0) {
        throw new Error(`ANSI Extended Symbol Data Segment value must not be empty. Received: ${value}`);
      }
      break;
    default:
      throw new Error(`Invalid Data Segment subtype ${subtype}`);
  }
}

class DataSegment {
  constructor(subtype, value) {
    validate(subtype, value);

    this.subtype = subtype;
    this.value = value;
  }

  encodeSize() {
    switch (this.subtype) {
      case SubtypeCodes.Simple:
        return 2 + this.value.length;
      case SubtypeCodes.ANSIExtendedSymbol:
        return 2 + this.value.length + (this.value.length % 2);
      default:
        throw new Error(`Invalid Data Segment subtype ${this.subtype}`);
    }
  }

  encode() {
    const buffer = Buffer.alloc(this.encodeSize());
    this.encodeTo(buffer, 0);
    return buffer;
  }

  encodeTo(buffer, offset) {
    offset = buffer.writeUInt8(0b10000000 | (this.subtype & 0b11111), offset);

    switch (this.subtype) {
      case SubtypeCodes.Simple: {
        offset = buffer.writeUInt8(this.value.length / 2, offset);
        const bytesCopied = this.value.copy(buffer, offset);
        if (bytesCopied !== this.value.length) {
          throw new Error('Buffer to encode Simple Data Segment value is not large enough');
        }
        offset += bytesCopied;
        break;
      }
      case SubtypeCodes.ANSIExtendedSymbol: {
        offset = buffer.writeUInt8(this.value.length, offset);
        const bytesWritten = buffer.write(this.value, offset, 'ascii');
        if (bytesWritten !== this.value.length) {
          throw new Error('Buffer to encode Simple Data Segment value is not large enough');
        }
        offset += bytesWritten;
        if (this.value.length % 2 > 0) {
          offset = buffer.writeUInt8(0, offset);
        }
        break;
      }
      default:
        throw new Error(`Invalid Data Segment subtype ${this.subtype}`);
    }
    return offset;
  }

  static Decode(buffer, offsetRef, segmentCode /* , padded */) {
    const subtype = getBits(segmentCode, 0, 5);
    const length = buffer.readUInt8(offsetRef.current); offsetRef.current += 1;

    let segment;
    switch (subtype) {
      case SubtypeCodes.Simple:
        if (buffer.length < offsetRef.current + 2 * length) {
          throw new Error('Simple Data Segment decode buffer not long enough');
        }
        segment = new DataSegment.Simple(
          buffer.slice(offsetRef.current, offsetRef.current + 2 * length),
        );
        offsetRef.current += 2 * length;
        break;
      case SubtypeCodes.ANSIExtendedSymbol:
        if (buffer.length < offsetRef.current + length) {
          throw new Error('ANSI Extended Symbol Data Segment decode buffer not long enough');
        }
        segment = new DataSegment.ANSIExtendedSymbol(buffer.toString('ascii', offsetRef.current, offsetRef.current + length));
        offsetRef.current += length;
        if (length % 2 > 0) {
          /** make sure pad byte is 0 */
          const padByte = buffer.readUInt8(offsetRef.current); offsetRef.current += 1;
          if (padByte !== 0) {
            throw new Error(`ANSI Extended Symbol Data Segment pad byte is not zero. Received: ${padByte}`);
          }
        }
        break;
      default:
        throw new Error(`Data segment subtype ${subtype} reserved for future use`);
    }

    return segment;
  }
}

DataSegment.Simple = class SimpleDataSegment extends DataSegment {
  constructor(value) {
    super(SubtypeCodes.Simple, value);
  }
};

DataSegment.ANSIExtendedSymbol = class ANSIExtendedSymbolDataSegment extends DataSegment {
  constructor(value) {
    super(SubtypeCodes.ANSIExtendedSymbol, value);
  }
};

export default DataSegment;
