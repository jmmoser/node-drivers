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
  InvertKeyValues
} = require('../../../../../utils');


const LogicalTypeCodes = {
  ClassID: 0,
  InstanceID: 1,
  MemberID: 2,
  ConnectionPoint: 3,
  AttributeID: 4,
  Special: 5, /** Does not use the logical addressing definition for the logical format */
  ServiceID: 6, /** Does not use the logical addressing definition for the logical format */
  Reserved: 7 
};

const LogicalTypeNames = InvertKeyValues(LogicalTypeCodes);


const LogicalFormatCodes = {
  LogicalAddress8Bit: 0,
  LogicalAddress16Bit: 1,
  LogicalAddress32Bit: 2,
  Reserved: 3
};

const LogicalFormatNames = InvertKeyValues(LogicalFormatCodes);

const LogicalFormatSizes = {
  [LogicalFormatCodes.LogicalAddress8Bit]: 1,
  [LogicalFormatCodes.LogicalAddress16Bit]: 2,
  [LogicalFormatCodes.LogicalAddress32Bit]: 4
};


const LogicalTypeServiceIDFormatCodes = {
  LogicalAddress8Bit: 0
};


class LogicalSegment {
  static Decode(segmentCode, buffer, offset, padded, cb) {
    const type = getBits(segmentCode, 2, 5);
    const format = getBits(segmentCode, 0, 2);

    if (format === LogicalFormatCodes.LogicalAddress32Bit) {
      if (type !== LogicalTypeCodes.InstanceID || type !== LogicalTypeCodes.ConnectionPoint) {
        throw new Error(`The 32-bit logical address format is only allowed for the logical Instance ID and Connection Point types. It is not allowed for any other Logical Type (reserved for future use).`);
      }
    }

    if (type === LogicalTypeCodes.ServiceID && format !== 0) {
      throw new Error(`Service ID Logical Type with format ${format} is reserved for future use`);
    }

    if (type === LogicalTypeCodes.Special && format !== 0) {
      throw new Error(`Special Logical Type with format ${format} is reserved for future use`);
    }

    let value;
    let formatName;
    if (type === LogicalTypeCodes.Special && format === 0) {
      if (format !== 0) {
        throw new Error(`Special Logical Type with format ${format} is reserved for future use`);
      }
      /** Electronic Key Segment, no pad byte */
      formatName = 'ElectronicKey';
      offset = DecodeElectronicKey(buffer, offset, val => value = val); 
    } else {
      const valueSize = LogicalFormatSizes[format];
      if (valueSize == null) {
        throw new Error(`Unexpected Logical Segment Format: ${format}`);
      }

      if (valueSize > 1 && padded) {
        offset += 1; /** Pad byte */
      }
      formatName = LogicalFormatNames[format];
      value = decodeUnsignedInteger(buffer, offset, valueSize);
      offset += valueSize;
    }

    if (typeof cb === 'function') {
      cb({
        type: {
          code: type,
          name: LogicalTypeNames[type]
        },
        format: {
          code: format,
          name: formatName
        },
        value
      });
    }

    return offset;
  }
}

module.exports = LogicalSegment;


function DecodeElectronicKey(buffer, offset, cb) {
  /** START AT THE KEY FORMAT */
  // const type = buffer.readUInt8(offset); offset += 1;

  const keyFormat = buffer.readUInt8(offset); offset += 1;
  if (keyFormat !== 4) {
    throw new Error(`Electronic Key Format of ${keyFormat} is reserved`);
  }

  const value = {};
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