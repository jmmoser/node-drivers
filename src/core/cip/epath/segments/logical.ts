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

import {
  getBits,
  decodeUnsignedInteger,
  unsignedIntegerSize,
  InvertKeyValues,
} from '../../../../utils';

import { CodeDescriptionMap, CodedValue, Ref } from '../../../../types';

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

const TypeNames: CodeDescriptionMap = Object.freeze(InvertKeyValues(TypeCodes)) as CodeDescriptionMap;

const FormatCodes = Object.freeze({
  Address8Bit: 0,
  Address16Bit: 1,
  Address32Bit: 2,
  Reserved: 3,
});

const FormatNames = Object.freeze(InvertKeyValues(FormatCodes)) as CodeDescriptionMap;

const LogicalFormatSizes = Object.freeze({
  [FormatCodes.Address8Bit]: 1,
  [FormatCodes.Address16Bit]: 2,
  [FormatCodes.Address32Bit]: 4,
});

// const ServiceIDFormatCodes = Object.freeze({
//   Address8Bit: 0
// });

const SpecialFormatCodes = Object.freeze({
  ElectronicKey: 0,
});

const ElectronicKeyFormatCodes = Object.freeze({
  Normal: 4,
});

interface SpecialValue {
  format: number;
}

interface ElectronicKeyValue extends SpecialValue {
  // format: number;
  vendorID: number;
  deviceType: number;
  productCode: number;
  compatibility: boolean;
  revision: {
    major: number;
    minor: number;
  }
};

type LogicalValue = number | ElectronicKeyValue;

function getFormatFromID(id: number) {
  switch (unsignedIntegerSize(id)) {
    case 1:
      return FormatCodes.Address8Bit;
    case 2:
      return FormatCodes.Address16Bit;
    case 4:
      return FormatCodes.Address32Bit;
    default:
      throw new Error(`Unable to determine logical segment format for id: ${id}`);
  }
}

function validate(type: number, format: number, value: LogicalValue) {
  switch (type) {
    case TypeCodes.ClassID:
    case TypeCodes.InstanceID:
    case TypeCodes.MemberID:
    case TypeCodes.AttributeID:
    case TypeCodes.ConnectionPoint:
    case TypeCodes.ServiceID:
      if (value != null && (!Number.isInteger(value) || value < 0)) {
        throw new Error(`Logical Segment of type ${TypeNames[type]}`);
      }
      break;
    case TypeCodes.Special:
      break;
    default:
      throw new Error(`Invalid Logical Segment type ${type}`);
  }

  if (format === FormatCodes.Address32Bit) {
    if (!(type === TypeCodes.InstanceID || type === TypeCodes.ConnectionPoint)) {
      throw new Error('The 32-bit logical address format is only allowed for the logical Instance ID and Connection Point types. It is not allowed for any other Logical Type (reserved for future use).');
    }
  }

  if (type === TypeCodes.ServiceID && format !== FormatCodes.Address8Bit) {
    throw new Error(`Logical type Service ID with format ${format} is reserved for future use`);
  }

  if (type === TypeCodes.Special) {
    if (format !== FormatCodes.Address8Bit) {
      throw new Error(`Logical type Special with format ${format} is reserved for future use`);
    }

    if (value != null) {
      if (typeof value !== 'object' || value.format !== ElectronicKeyFormatCodes.Normal) {
        throw new Error('Logical type Special value must be a valid Electronic Key object');
      }
    }
  }
}

function encodeSize(padded: boolean, type: number, format: number, value: LogicalValue) {
  let size = 1;

  switch (type) {
    case TypeCodes.ClassID:
    case TypeCodes.InstanceID:
    case TypeCodes.AttributeID:
    case TypeCodes.MemberID:
    case TypeCodes.ConnectionPoint:
    case TypeCodes.ServiceID: {
      switch (format) {
        case FormatCodes.Address8Bit:
          size += 1;
          break;
        case FormatCodes.Address16Bit:
          size += 2 + (padded ? 1 : 0);
          break;
        case FormatCodes.Address32Bit:
          size += 4 + (padded ? 1 : 0);
          break;
        default:
          throw new Error(`Logical segment unknown ${TypeNames[type]} format ${format}`);
      }
      break;
    }
    case TypeCodes.Special: {
      switch (format) {
        case SpecialFormatCodes.ElectronicKey:
          if (typeof value === 'object' && value.format === ElectronicKeyFormatCodes.Normal) {
            size += 9;
          } else {
            throw new Error('Invalid Electronic Key Logical Segment value');
          }
          break;
        default:
          throw new Error(`Invalid Special Logical segment format ${format}`);
      }
      break;
    }
    default:
      throw new Error(`Unknown Logical Segment type ${type}`);
  }

  return size;
}

function encodeTo(buffer: Buffer, offset: number, padded: boolean, type: number, format: number, value: LogicalValue) {
  offset = buffer.writeUInt8(0b00100000 | ((type & 0b111) << 2) | (format & 0b11), offset);

  switch (type) {
    case TypeCodes.ClassID:
    case TypeCodes.InstanceID:
    case TypeCodes.AttributeID:
    case TypeCodes.MemberID:
    case TypeCodes.ConnectionPoint:
    case TypeCodes.ServiceID: {
      const val = value as number;
      switch (format) {
        case FormatCodes.Address8Bit:
          offset = buffer.writeUInt8(val, offset);
          break;
        case FormatCodes.Address16Bit:
          if (padded) {
            offset = buffer.writeUInt8(0, offset);
          }
          offset = buffer.writeUInt16LE(val, offset);
          break;
        case FormatCodes.Address32Bit:
          if (padded) {
            offset = buffer.writeUInt8(0, offset);
          }
          offset = buffer.writeUInt32LE(val, offset);
          break;
        default:
          throw new Error(`Logical segment unknown ${TypeNames[type]} format ${format}`);
      }
      break;
    }
    case TypeCodes.Special: {
      switch (format) {
        case SpecialFormatCodes.ElectronicKey:
          const val = value as ElectronicKeyValue;
          switch (val.format) {
            case ElectronicKeyFormatCodes.Normal: {
              offset = buffer.writeUInt8(val.format, offset);
              offset = buffer.writeUInt16LE(val.vendorID, offset);
              offset = buffer.writeUInt16LE(val.deviceType, offset);
              offset = buffer.writeUInt16LE(val.productCode, offset);
              offset = buffer.writeUInt8(
                (((val.compatibility ? 1 : 0) << 7) | (val.revision.major & 0b1111111)),
                offset,
              );
              offset = buffer.writeUInt8(val.revision.minor, offset);
              break;
            }
            default:
              throw new Error('Invalid Electronic Key Logical Segment');
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

  return offset;
}

function DecodeElectronicKey(buffer: Buffer, offsetRef: Ref): ElectronicKeyValue {
  /** STARTS AT THE KEY FORMAT */
  const keyFormat = buffer.readUInt8(offsetRef.current); offsetRef.current += 1;
  if (keyFormat !== ElectronicKeyFormatCodes.Normal) {
    throw new Error(`Electronic Key Format of ${keyFormat} is reserved`);
  }

  const format = keyFormat;
  const vendorID = buffer.readUInt16LE(offsetRef.current); offsetRef.current += 2;
  const deviceType = buffer.readUInt16LE(offsetRef.current); offsetRef.current += 2;
  const productCode = buffer.readUInt16LE(offsetRef.current); offsetRef.current += 2;
  const majorRevisionByte = buffer.readUInt8(offsetRef.current); offsetRef.current += 1;

  /**
   * Compatibility bit:
   * If clear then any non-zero Vendor ID, Device Type, Product Code,
   * Major Revision, and Minor Revision shall match. If set, then any
   * key may be accepted which a device can emulate.
   * */
  const compatibility = !!getBits(majorRevisionByte, 7, 8);
  const majorRevision = getBits(majorRevisionByte, 0, 7);
  const minorRevision = buffer.readUInt8(offsetRef.current); offsetRef.current += 1;

  return {
    format,
    vendorID,
    deviceType,
    productCode,
    compatibility,
    revision: {
      major: majorRevision,
      minor: minorRevision,
    },
  };
}

export default class LogicalSegment {
  type: CodedValue;
  format: CodedValue;
  value: LogicalValue;

  constructor(type: number, format: number, value: LogicalValue) {
    if (format == null) {
      if (typeof value !== 'number') {
        throw new Error('EPath logical segment error: Value must be a number if format is not specified');
      }
      format = getFormatFromID(value);
    }

    let formatName;
    if (type === TypeCodes.Special && format === SpecialFormatCodes.ElectronicKey) {
      formatName = 'ElectronicKey';
    } else {
      formatName = FormatNames[format] || 'Unknown';
    }

    validate(type, format, value);

    this.type = {
      code: type,
      description: TypeNames[type] || 'Unknown',
    };
    this.format = {
      code: format,
      description: formatName,
    };
    this.value = value;
  }

  encodeSize(padded: boolean) {
    return encodeSize(padded, this.type.code, this.format.code, this.value);
  }

  encode(padded: boolean) {
    const buffer = Buffer.alloc(this.encodeSize(padded));
    this.encodeTo(buffer, 0, padded);
    return buffer;
  }

  encodeTo(buffer: Buffer, offset: number, padded: boolean) {
    return encodeTo(buffer, offset, padded, this.type.code, this.format.code, this.value);
  }

  static Decode(buffer: Buffer, offsetRef: Ref, segmentCode: number, padded: boolean) {
    const type = getBits(segmentCode, 2, 5);
    const format = getBits(segmentCode, 0, 2);

    let value;
    if (type === TypeCodes.Special) {
      if (format !== SpecialFormatCodes.ElectronicKey) {
        throw new Error(`Special Logical Type with format ${format} is reserved for future use`);
      }
      /** Electronic Key Segment, no pad byte */
      value = DecodeElectronicKey(buffer, offsetRef);
    } else {
      const valueSize = LogicalFormatSizes[format];
      if (valueSize == null) {
        throw new Error(`Unexpected Logical Segment Format: ${format}`);
      }

      if (valueSize > 1 && padded) {
        // offset += 1; /** Pad byte */
        /** make sure pad byte is 0 */
        const padByte = buffer.readUInt8(offsetRef.current); offsetRef.current += 1;
        if (padByte !== 0) {
          throw new Error(`Padded EPath Logical Segment pad byte is not zero. Received: ${padByte}`);
        }
      }

      value = decodeUnsignedInteger(buffer, offsetRef.current, valueSize) as number;
      offsetRef.current += valueSize;
    }

    switch (type) {
      case TypeCodes.ClassID:
        return new LogicalSegment(TypeCodes.ClassID, format, value);
      case TypeCodes.InstanceID:
        return new LogicalSegment(TypeCodes.InstanceID, format, value);
      case TypeCodes.AttributeID:
        return new LogicalSegment(TypeCodes.AttributeID, format, value);
      case TypeCodes.MemberID:
        return new LogicalSegment(TypeCodes.MemberID, format, value);
      case TypeCodes.ServiceID:
        return new LogicalSegment(TypeCodes.ServiceID, format, value);
      case TypeCodes.Special:
        return new LogicalSegment(TypeCodes.Special, format, value);
      case TypeCodes.ConnectionPoint:
        return new LogicalSegment(TypeCodes.ConnectionPoint, format, value);
      default:
        throw new Error(`Invalid logical segment type: ${type}`);
    }
    // return new LogicalSegment(type, format, value);
  }

  /** Helper function for the only kind of Special Logical Segment */
  static SpecialNormalElectronicKey(
    vendorID: number, deviceType: number, productCode: number, majorRevision: number, minorRevision: number, compatibility: boolean,
  ) {
    return new LogicalSegment(TypeCodes.Special, SpecialFormatCodes.ElectronicKey, {
      vendorID,
      deviceType,
      productCode,
      revision: {
        major: majorRevision,
        minor: minorRevision,
      },
      compatibility,
      format: ElectronicKeyFormatCodes.Normal,
    });
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
