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
  // getBit,
  getBits,
  decodeUnsignedInteger
  // InvertKeyValues
} = require('../../../../../utils');


const { DataType, DataTypeCodes } = require('../../../datatypes');


class DataTypeSegment {
  constructor(constructed, code) {
    this.constructed = constructed;
    this.value = {
      code
    };
  }

  static Decode(segmentCode, buffer, offset, padded, cb) {
    let code;
    let constructed;
    switch (getBits(segmentCode, 5, 8)) {
      case 5:
        constructed = true;
        // TODO
        throw new Error(`Constructed data type segment not yet supported`);
        break;
      case 6:
        constructed = false;
        code = segmentCode;
        break;
      default:
        throw new Error(`Invalid data type segment. Received segment code: ${segmentCode}`);
    }

    if (typeof cb === 'function') {
      if (constructed) {
        cb(new DataTypeSegment.Constructed(code));
      } else {
        cb(new DataTypeSegment.Elementary(code));
      }
    }

    return offset;
  }
}


DataTypeSegment.Elementary = class ElementaryDataTypeSegment extends DataTypeSegment {
  constructor(code) {
    super(false, code);
  }
}

DataTypeSegment.Constructed = class ElementaryDataTypeSegment extends DataTypeSegment {
  constructor(code) {
    super(true, code);
  }
}

module.exports = DataTypeSegment;



function __DecodeDataType(buffer, offset, cb) {
  let type;
  const code = buffer.readUInt8(offset); offset += 1;
  switch (code) {
    case DataTypeCodes.ABBREV_STRUCT: {
      const length = buffer.readUInt8(offset); offset += 1;
      const crc = decodeUnsignedInteger(buffer, offset, length);
      offset += length;
      type = DataType.ABBREV_STRUCT(crc);
      break;
    }
    case DataTypeCodes.ABBREV_ARRAY: {
      /* const length = buffer.readUInt8(offset); */ offset += 1;
      let itemType;
      offset = __DecodeDataType(buffer, offset, items => itemType = items);
      type = Datatype.ABBREV_ARRAY(itemType);
      break;
    }
    case DataTypeCodes.STRUCT: {
      const length = buffer.readUInt8(offset); offset += 1;
      const members = [];
      const lastOffset = offset + length;
      while (offset < lastOffset) {
        offset = __DecodeDataType(buffer, offset, function (member) {
          members.push(member);
        });
      }
      type = DataType.STRUCT(members);
      break;
    }
    case DataTypeCodes.ARRAY: {
      /* const length = buffer.readUInt8(offset); */ offset += 1;

      const lowerBoundTag = buffer.readUInt8(offset); offset += 1;
      const lowerBoundLength = buffer.readUInt8(offset); offset += 1;
      const lowerBound = decodeUnsignedInteger(buffer, offset, lowerBoundLength);
      offset += lowerBoundLength;

      const upperBoundTag = buffer.readUInt8(offset); offset += 1;
      const upperBoundLength = buffer.readUInt8(offset); offset += 1;
      const upperBound = decodeUnsignedInteger(buffer, offset, upperBoundLength);
      offset += upperBoundLength;

      const boundTags = [lowerBoundTag, upperBoundTag];

      let itemType;
      offset = __DecodeDataType(buffer, offset, items => itemType = items);
      type = DataType.ARRAY(itemType, lowerBound, upperBound, boundTags);
      break;
    }
    default:
      type = DataType[DataTypeNames[code]]();
      break;
  }

  if (typeof cb === 'function') {
    cb(type);
  }

  return offset;
}


function DecodeDataType(buffer, offset, cb) {
  const nextOffset = __DecodeDataType(buffer, offset, cb);
  if (nextOffset - offset === 1) {
    /**
     * If data type is elementary then __DecodeDataType will only
     * read 1 byte but data type encoding is 2 bytes
     */
    return offset + 2;
  }
  return nextOffset;
}