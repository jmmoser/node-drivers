'use strict';

/**
 * CIP Vol 1, Appendix C-1.4.5
 *
 * The data segment provides a mechanism for delivering data to an application. This may occur
 * during connection establishment, or at any other time as defined by the application.
 */

'use strict';

/**
 * CIP Vol 1, Appendix C-1.4.3
 * 
 * The network segment shall be used to specify network parameters that may be required by a
 * node to transmit a message across a network. The network segment shall immediately precede
 * the port segment of the device to which it applies. In other words, the network segment shall
 * be the first item in the path that the device receives.
 */

const {
  getBit,
  getBits,
  InvertKeyValues
} = require('../../../../../utils');

const SubtypeCodes = {
  Simple: 0,
  ANSIExtendedSymbol: 17
};


class DataSegment {
  constructor(subtype, value) {
    validate(subtype, value);

    this.subtype = subtype;
    this.value = value;
  }

  encodeSize(padded) {
    return encodeSize(this.subtype, this.value);
  }

  encode(padded) {
    const buffer = Buffer.alloc(this.encodeSize(padded));
    this.encodeTo(buffer, 0, padded);
    return buffer;
  }

  encodeTo(buffer, offset, padded) {
    return encodeTo(buffer, offset, padded, this.subtype, this.value);
  }

  static Decode(segmentCode, buffer, offset, padded, cb) {
    const subtype = getBits(segmentCode, 0, 5);

    switch (subtype) {
      case SubtypeCodes.Simple:

        break;
      case SubtypeCodes.ANSIExtendedSymbol:

        break;
      default:
        throw new Error(`Data segment subtype ${subtype} reserved for future use`);
    }


    if (typeof cb === 'function') {
      cb({
        // number,
        // address
      });
    }

    return offset;
  }
}


DataSegment.Simple = class SimpleDataSegment extends DataSegment {
  constructor(buffer) {
    super(SubtypeCodes.Simple, buffer);
  }
}

DataSegment.ANSIExtendedSymbol = class ANSIExtendedSymbolDataSegment extends DataSegment {
  constructor(symbol) {
    if (typeof symbol !== 'string' || symbol.length === 0) {
      throw new Error(`ANSI Extended Symbol Data Segment value must be a non-empty string. Received '${symbol}'`);
    }
    const pad = symbol.length % 2;
    const buffer = Buffer.allocUnsafe(1 + symbol.length + pad);
    let offset = 0;
    offset = buffer.writeUInt8(symbol.length, offset);
    offset += buffer.write(symbol, offset, 'ascii');
    if (pad > 0) {
      offset = buffer.writeUInt8(0, offset);
    }
    super(SubtypeCodes.ANSIExtendedSymbol, buffer);
  }
}

module.exports = DataSegment;


function validate(subtype, value) {
  if (value != null && !Buffer.isBuffer(value)) {
    throw new Error(`Data segment value must be a buffer`);
  }
}


function encodeSize(subtype, value) {
  return 1 + value.length;
}


function encodeTo(buffer, offset, padded, subtype, value) {
  offset = buffer.writeUInt8(0b10000000 | (subtype & 0b11111), offset);
  offset += value.copy(buffer, offset);
  return offset;
}