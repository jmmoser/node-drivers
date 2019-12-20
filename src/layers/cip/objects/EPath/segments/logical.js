'use strict';

/**
 * CIP Vol 1, Appendix C-1.4.2
 *
 * The logical segment selects a particular object address within a device (for example, Object
 * Class, Object Instance, and Object Attribute). When the logical segment is included within a
 * Packed Path, the Logical Value shall be appended to the segment type byte with no pad in
 * between. When the logical segment is included within a Padded Path, the 16-bit and 32-bit
 * logical formats shall have a pad inserted between the segment type byte and the Logical Value
 * (the 8-bit format is identical to the Packed Path). The pad byte shall be set to zero.
 */

const {
  getBit,
  getBits,
  decodeUnsignedInteger,
  sizeToEncodeUnsignedInteger,
  InvertKeyValues
} = require('../../../../../utils');


const TypeCodes = Object.freeze({
  ClassID: 0,
  InstanceID: 1,
  MemberID: 2,
  ConnectionPoint: 3,
  AttributeID: 4,
  Special: 5, /** Does not use the logical addressing definition for the logical format */
  ServiceID: 6, /** Does not use the logical addressing definition for the logical format */
  // Reserved: 7
});

const TypeNames = Object.freeze(InvertKeyValues(TypeCodes));


const FormatCodes = Object.freeze({
  LogicalAddress8Bit: 0,
  LogicalAddress16Bit: 1,
  LogicalAddress32Bit: 2,
  Reserved: 3
});

const FormatNames = Object.freeze(InvertKeyValues(FormatCodes));

const LogicalFormatSizes = Object.freeze({
  [FormatCodes.LogicalAddress8Bit]: 1,
  [FormatCodes.LogicalAddress16Bit]: 2,
  [FormatCodes.LogicalAddress32Bit]: 4
});

const ServiceIDFormatCodes = Object.freeze({
  LogicalAddress8Bit: 0
});

const SpecialFormatCodes = Object.freeze({
  ElectronicKey: 0
});

const ElectronicKeyFormatCodes = Object.freeze({
  Normal: 4
});


class LogicalSegment {
  constructor(type, format, value, extra) {
    if (format == null) {
      format = getFormatFromID(value);
    }

    let formatName;
    if (type === TypeCodes.Special && format === 0) {
      formatName = 'ElectronicKey';
    } else {
      formatName = FormatNames[format] || 'Unknown';
    }

    this.type = {
      code: type,
      name: TypeNames[type] || 'Unknown'
    };
    this.format = {
      code: format,
      name: formatName
    };
    this.value = value;

    if (extra) {
      this.extra = extra;
    }
  }

  encodeSize(padded) {
    return encodeSize(padded, this.type.code, this.format.code, this.value);
  }

  encode(padded) {
    const buffer = Buffer.alloc(this.encodeSize(padded));
    this.encodeTo(buffer, offset, padded);
    return buffer;
  }

  encodeTo(buffer, offset, padded) {
    return encodeTo(buffer, offset, padded, this.type.code, this.format.code, this.value);
  }

  static EncodeSize(padded, type, format, value) {
    return encodeSize(padded, type, format, value); 
  }

  static Encode(padded, type, format, value) {
    const buffer = Buffer.alloc(encodeSize(padded, type, format, value));
    encodeTo(buffer, 0, padded, type, format, value);
    return buffer;
  }

  static EncodeTo(buffer, offset, padded, type, format, value) {
    return encodeTo(buffer, offset, padded, type, format, value);
  }

  static Decode(segmentCode, buffer, offset, padded, cb) {
    const type = getBits(segmentCode, 2, 5);
    const format = getBits(segmentCode, 0, 2);

    if (format === FormatCodes.LogicalAddress32Bit) {
      if (type !== TypeCodes.InstanceID || type !== TypeCodes.ConnectionPoint) {
        throw new Error(`The 32-bit logical address format is only allowed for the logical Instance ID and Connection Point types. It is not allowed for any other Logical Type (reserved for future use).`);
      }
    }

    if (type === TypeCodes.ServiceID && format !== 0) {
      throw new Error(`Service ID Logical Type with format ${format} is reserved for future use`);
    }

    if (type === TypeCodes.Special && format !== 0) {
      throw new Error(`Special Logical Type with format ${format} is reserved for future use`);
    }

    let value;
    if (type === TypeCodes.Special) {
      if (format !== SpecialFormatCodes.ElectronicKey) {
        throw new Error(`Special Logical Type with format ${format} is reserved for future use`);
      }
      /** Electronic Key Segment, no pad byte */
      offset = DecodeElectronicKey(buffer, offset, val => value = val); 
    } else {
      const valueSize = LogicalFormatSizes[format];
      if (valueSize == null) {
        throw new Error(`Unexpected Logical Segment Format: ${format}`);
      }

      if (valueSize > 1 && padded) {
        offset += 1; /** Pad byte */
      }

      value = decodeUnsignedInteger(buffer, offset, valueSize);
      offset += valueSize;
    }

    if (typeof cb === 'function') {
      cb(new LogicalSegment(type, format, value));
    }

    return offset;
  }

  static ClassID(value, format) {
    return new LogicalSegment(TypeCodes.ClassID, format, value);
  }

  static InstanceID(value, format) {
    return new LogicalSegment(TypeCodes.InstanceID, format, value);
  }

  static AttributeID(value, format) {
    return new LogicalSegment(TypeCodes.AttributeID, format, value);
  }

  static MemberID(value, format) {
    return new LogicalSegment(TypeCodes.MemberID, format, value);
  }

  static ConnectionPoint(value, format) {
    return new LogicalSegment(TypeCodes.ConnectionPoint, format, value);
  }

  static ServiceID(value, format) {
    /** only format code 0 is currently supported by CIP, constructor still calls getFormatFromID for validation */
    return new LogicalSegment(TypeCodes.ServiceID, format, value);
  }

  static Special(value, format) {
    if (format == null) {
      format = SpecialFormatCodes.ElectronicKey;
    }
    return new LogicalSegment(TypeCodes.Special, format, value);
  }


  /** Helper function for the only kind of Special Logical Segment */
  static SpecialNormalElectronicKey(vendorID, deviceType, productCode, majorRevision, minorRevision, compatibility) {
    return new LogicalSegment(TypeCodes.Special, SpecialFormatCodes.ElectronicKey, {
      vendorID,
      deviceType,
      productCode,
      revision: {
        major: majorRevision,
        minor: minorRevision
      },
      compatibility,
      format: ElectronicKeyFormatCodes.Normal
    })
  }

  static get Types() {
    return TypeCodes;
  }

  static get Formats() {
    return FormatCodes;
  }

  static get SpecialTypeFormats() {
    return SpecialFormatCodes;
  }
}


module.exports = LogicalSegment;


function getFormatFromID(id) {
  switch (sizeToEncodeUnsignedInteger(id)) {
    case 1:
      return FormatCodes.LogicalAddress8Bit;
    case 2:
      return FormatCodes.LogicalAddress16Bit;
    case 4:
      return FormatCodes.LogicalAddress32Bit;
    default:
      throw new Error(`Unable to determin logical segment format for id: ${id}`);
  }
}


function DecodeElectronicKey(buffer, offset, cb) {
  /** STARTS AT THE KEY FORMAT */
  const keyFormat = buffer.readUInt8(offset); offset += 1;
  if (keyFormat !== ElectronicKeyFormatCodes.Normal) {
    throw new Error(`Electronic Key Format of ${keyFormat} is reserved`);
  }

  const value = {};
  value.format = keyFormat;
  value.vendorID = buffer.readUInt16LE(offset); offset += 2;
  value.deviceType = buffer.readUInt16LE(offset); offset += 2;
  value.productCode = buffer.readUInt16LE(offset); offset += 2;
  const majorRevisionByte = buffer.readUInt8(offset); offset += 1;
  
  /** 
   * Compatibility bit:
   * If clear then any non-zero Vendor ID, Device Type, Product Code,
   * Major Revision, and Minor Revision shall match. If set, then any
   * key may be accepted which a device can emulate.
   * */
  value.compatibility = getBit(majorRevisionByte, 7);
  value.revision = {};
  value.revision.major = getBits(majorRevisionByte, 0, 7);
  value.revision.minor = buffer.readUInt8(offset); offset += 1;

  if (typeof cb === 'function') {
    cb(value);
  }
  
  return offset;
}


function encodeSize(padded, type, format, value) {
  let size = 1;

  switch (type) {
    case TypeCodes.ClassID:
    case TypeCodes.InstanceID:
    case TypeCodes.AttributeID:
    case TypeCodes.MemberID:
    case TypeCodes.ConnectionPoint:
    case TypeCodes.ServiceID: {
      switch (format) {
        case FormatCodes.LogicalAddress8Bit:
          size += 1;
          break;
        case FormatCodes.LogicalAddress16Bit:
          size += 2 + (padded ? 1 : 0);
          break;
        case FormatCodes.LogicalAddress32Bit:
          size += 4 + (padded ? 1 : 0);
          break;
        default:
          throw new Error(`Logical segment unknown ${TypeNames[type]} format ${format}`);
      }
    }
    case TypeCodes.Special: {
      switch (format) {
        case SpecialFormatCodes.ElectronicKey:
          if (typeof value === 'object' && value.format === ElectronicKeyFormatCodes.Normal) {
            size += 9;
          } else {
            throw new Error(`Invalid Electronic Key Logical Segment value`);
          }
          break;
        default:
          break;
      }
      break;
    }
    default:
      throw new Error(`Unknown Logical Segment type ${type}`);
  }

  return size;
}


function encodeBuffer(padded, type, format, value) {
  return Buffer.alloc(encodeSize(padded, type, format, value));
}



function encodeTo(buffer, offset, padded, type, format, value) {
  offset = buffer.writeUInt8(0b00100000 | ((type & 0b111) << 2) | (format & 0b11), offset);

  switch (type) {
    case TypeCodes.ClassID:
    case TypeCodes.InstanceID:
    case TypeCodes.AttributeID:
    case TypeCodes.MemberID:
    case TypeCodes.ConnectionPoint:
    case TypeCodes.ServiceID: {
      switch (format) {
        case FormatCodes.LogicalAddress8Bit:
          offset = buffer.writeUInt8(value, offset);
          break;
        case FormatCodes.LogicalAddress16Bit:
          if (padded) {
            offset = buffer.writeUInt8(0, offset);
          }
          offset = buffer.writeUInt16LE(value, offset);
          break;
        case FormatCodes.LogicalAddress32Bit:
          if (padded) {
            offset = buffer.writeUInt8(0, offset);
          }
          offset = buffer.writeUInt32LE(value, offset);
          break;
        default:
          throw new Error(`Logical segment unknown ${TypeNames[type]} format ${format}`);
      }
    }
    case TypeCodes.Special: {
      switch (format) {
        case SpecialFormatCodes.ElectronicKey:
          switch (value.format) {
            case ElectronicKeyFormatCodes.Normal: {
              offset = buffer.writeUInt8(value.format, offset);
              offset = buffer.writeUInt16LE(value.vendorID, offset);
              offset = buffer.writeUInt16LE(value.deviceType, offset);
              offset = buffer.writeUInt16LE(value.productCode, offset);
              offset = buffer.writeUInt8((((value.compatibility ? 1 : 0) << 7) | (value.revision.major & 0b1111111)), offset);
              offset = buffer.writeUInt8(value.revision.minor, offset);
              break;
            }
            default:
              throw new Error(`Invalid Electronic Key Logical Segment`);
          }
          break;
        default:
          throw new Error(`Unknown Special Logical Segment format ${format}`);
      }
      break;
    }
    default:
      throw new Error(`Unknown Logical Segment type ${type}`);
  }
}