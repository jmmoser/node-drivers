'use strict';

const { Decode, DataType } = require('./CIP');
const CIPObject = require('./CIPObject');
const { getBit, getBits, InvertKeyValues } = require('../../../utils');


/** Class Code 0x01 */
class Identity extends CIPObject {
  constructor() {
    super(CIP.Classes.Identity);
  }

  static DecodeInstanceAttribute(attribute, data, offset, cb) {
    const dataType = InstanceAttributeDataTypes[attribute];
    if (!dataType) {
      throw new Error(`Unknown instance attribute: ${attribute}`);
    }

    let value;
    offset = Decode(dataType, data, offset, val => value = val);
    const raw = value;

    switch (attribute) {
      case InstanceAttributeCodes.Revision: {
        if (Array.isArray(value) && value.length >= 2) {
          value = {
            major: value[0],
            minor: value[1]
          };
        }
        break;
      }
      case InstanceAttributeCodes.Status: {
        /** CIP Vol 1, Table 5-2.3 */
        value = {
          code: value,
          owned: getBit(value, 0),
          configured: getBit(value, 3),
          extendedDeviceStatus: ExtendedDeviceStatusDescriptions[getBits(value, 4, 8)] || 'Vendor/Product specific',
          minorRecoverableFault: getBit(value, 8),
          minorUnrecoverableFault: getBit(value, 9),
          majorRecoverableFault: getBit(value, 10),
          majorUnrecoverableFault: getBit(value, 11)
        };
        break;
      }
      case InstanceAttributeCodes.State: {
        value = {
          code: value,
          description: InstanceStateDescriptions[value] || 'Unknown'
        }
        break;
      }
      default:
        break;
    }

    if (typeof cb === 'function') {
      cb({
        code: attribute,
        name: InstanceAttributeNames[attribute] || 'Unknown',
        value,
        raw
      });
    }

    return offset;
  }


  static ParseInstanceAttributesAll(buffer, offset, cb) {
    const attributes = [
      InstanceAttributeCodes.VendorID,
      InstanceAttributeCodes.DeviceType,
      InstanceAttributeCodes.ProductCode,
      InstanceAttributeCodes.Revision,
      InstanceAttributeCodes.Status,
      InstanceAttributeCodes.SerialNumber,
      InstanceAttributeCodes.ProductName
    ].reduce((accum, attribute) => {
      offset = this.DecodeInstanceAttribute(attribute, buffer, offset, val => accum.push(val));
      return accum;
    }, []);

    // const attributes = [
    //   InstanceAttributeCodes.VendorID,
    //   InstanceAttributeCodes.DeviceType,
    //   InstanceAttributeCodes.ProductCode,
    //   InstanceAttributeCodes.Revision,
    //   InstanceAttributeCodes.Status,
    //   InstanceAttributeCodes.SerialNumber,
    //   InstanceAttributeCodes.ProductName
    // ].reduce((accum, attribute) => {
    //   offset = this.DecodeInstanceAttribute(attribute, buffer, offset, val => accum[attribute] = val);
    //   return accum;
    // }, {});

    // const attributes = {};
    // offset = this.DecodeInstanceAttribute(InstanceAttributeCodes.VendorID, buffer, offset, val => attributes.vendorID = val);
    // offset = this.DecodeInstanceAttribute(InstanceAttributeCodes.DeviceType, buffer, offset, val => attributes.deviceType = val);
    // offset = this.DecodeInstanceAttribute(InstanceAttributeCodes.ProductCode, buffer, offset, val => attributes.productCode = val);
    // offset = this.DecodeInstanceAttribute(InstanceAttributeCodes.Revision, buffer, offset, val => attributes.revision = val);
    // offset = this.DecodeInstanceAttribute(InstanceAttributeCodes.Status, buffer, offset, val => attributes.status = val);
    // offset = this.DecodeInstanceAttribute(InstanceAttributeCodes.SerialNumber, buffer, offset, val => attributes.serialNumber = val);
    // offset = this.DecodeInstanceAttribute(InstanceAttributeCodes.ProductName, buffer, offset, val => attributes.productName = val);

    if (typeof cb === 'function') {
      cb(attributes);
    }

    return offset;
  }


  // static ParseInstanceAttributeState(buffer, offset, cb) {
  //   const code = buffer.readUInt8(offset); offset += 1;
  //   const state = {
  //     code,
  //     description: InstanceStateDescriptions[code] || 'unknown'
  //   };

  //   if (typeof cb === 'function') {
  //     cb(state);
  //   }

  //   return offset;
  // }


  static get Services() {
    return ClassServices;
  }


  static DecodeGetAttributesAll(data, offset, cb) {
    const info = {};
    info.data = data;
    const length = data.length;

    if (offset < length - 1) {
      offset = Decode(DataType.UINT, data, offset, val => info.vendorID = val);
    }

    if (offset < length - 1) {
      offset = Decode(DataType.UINT, data, offset, val => info.maxInstanceID = val);
    }

    if (offset < length - 1) {
      offset = Decode(DataType.UINT, data, offset, val => info.numberOfInstances = val);
    }

    if (offset < length - 1) {
      let numberOfOptionalAttributes;
      offset = Decode(DataType.UINT, data, offset, val => numberOfOptionalAttributes = val);

      info.optionalAttributes = [];
      for (let i = 0; i < numberOfOptionalAttributes; i++) {
        if (offset < length - 1) {
          offset = Decode(DataType.UINT, data, offset, val => info.optionalAttributes.push(val));
        } else {
          // console.log('breaking optional attributes');
          break;
        }
      }

      // console.log({
      //   numberOfOptionalAttributes,
      //   length: info.optionalAttributes.length
      // });
    }

    if (offset < length - 1) {
      let numberOfOptionalServices;
      offset = Decode(DataType.UINT, data, offset, val => numberOfOptionalServices = val);

      info.optionalServices = [];
      for (let i = 0; i < numberOfOptionalServices; i++) {
        if (offset < length - 1) {
          offset = Decode(DataType.UINT, data, offset, val => info.optionalServices.push({
            code: val,
            name: CommonServiceNames[val] || 'Unknown',
            hex: `0x${val.toString('16')}`
          }));
        } else {
          // console.log('breaking optional services');
          break;
        }
      }

      // console.log({
      //   numberOfOptionalServices,
      //   length: info.optionalServices.length
      // });
    }

    if (offset < length - 1) {
      offset = Decode(DataType.UINT, data, offset, val => info.maxIDNumberOfClassAttributes = val);
    }

    if (offset < length - 1) {
      offset = Decode(DataType.UINT, data, offset, val => info.maxIDNumberOfInstanceAttributes = val);
    }

    info.extra = data.slice(offset);

    if (typeof cb === 'function') {
      cb(info);
    }

    // console.log(data.readUInt16LE(length - 4));
    // console.log(data.readUInt16LE(length - 2));
    // console.log(data.slice(length - 8));

    return offset;
  }
}


const ClassServices = {
  GetAttributesAll: 0x01,
  Reset: 0x05,
  GetAttributeSingle: 0x0E,
  SetAttributeSingle: 0x10,
  FindNextObjectInstance: 0x11
};

// CIP Vol1 5-2
Identity.Code = 0x01;


// CIP Vol1 Table 5-2.2
const InstanceAttributeCodes = {
  VendorID: 1,
  DeviceType: 2,
  ProductCode: 3,
  Revision: 4,
  Status: 5,
  SerialNumber: 6,
  ProductName: 7,
  State: 8,
  ConfigurationConsistencyValue: 9,
  HeartbeatInterval: 10,
  ActiveLanguage: 11,
  SupportedLanguageList: 12,
  InternationalProductName: 13,
  Semaphore: 14,
  AssignedName: 15,
  AssignedDescription: 16,
  GeographicLocation: 17,
  ModbusIdentityInfo: 18
};

Identity.InstanceAttribute = InstanceAttributeCodes;

const InstanceAttributeNames = InvertKeyValues(InstanceAttributeCodes);


const InstanceAttributeDataTypes = {
  [InstanceAttributeCodes.VendorID]: DataType.UINT,
  [InstanceAttributeCodes.DeviceType]: DataType.UINT,
  [InstanceAttributeCodes.ProductCode]: DataType.UINT,
  [InstanceAttributeCodes.Revision]: DataType.STRUCT([DataType.USINT, DataType.USINT]),
  [InstanceAttributeCodes.Status]: DataType.WORD,
  [InstanceAttributeCodes.SerialNumber]: DataType.UDINT,
  [InstanceAttributeCodes.ProductName]: DataType.SHORT_STRING,
  [InstanceAttributeCodes.State]: DataType.USINT,
  [InstanceAttributeCodes.ConfigurationConsistencyValue]: DataType.UINT,
  [InstanceAttributeCodes.HeartbeatInterval]: DataType.USINT,
  [InstanceAttributeCodes.ActiveLanguage]: DataType.STRUCT([DataType.USINT, DataType.USINT, DataType.USINT]),
  [InstanceAttributeCodes.SupportedLanguageList]: DataType.ABBREV_ARRAY(DataType.STRUCT([DataType.USINT, DataType.USINT, DataType.USINT])),
  [InstanceAttributeCodes.InternationalProductName]: DataType.STRINGI,
  [InstanceAttributeCodes.Semaphore]: DataType.STRUCT([DataType.UINT, DataType.UDINT, DataType.ITIME]),
  [InstanceAttributeCodes.AssignedName]: DataType.STRINGI,
  [InstanceAttributeCodes.AssignedDescription]: DataType.STRINGI,
  [InstanceAttributeCodes.GeographicLocation]: DataType.STRING,
  // [InstanceAttributeCodes.ModbusIdentityInfo]: /** See CIP Vol 7, Chapter 5 */
};


// CIP Vol1 Table 5-2.2, Attribute ID 8, Semantics of Values
const InstanceStateDescriptions = {
  0: 'Non-existent',
  1: 'Device self testing',
  2: 'Standby',
  3: 'Operational',
  4: 'Major recoverable fault',
  5: 'Major unrecoverable fault',
  255: 'Default for Get_Attributes_All service'
};

Identity.InstanceStateDescriptions = InstanceStateDescriptions;


// CIP Vol1 Table 5-2.4
const ExtendedDeviceStatusDescriptions = {
  0b0000: 'Self-testing or unknown',
  0b0001: 'Firmware update in progress',
  0b0010: 'At least one faulted I/O connection',
  0b0011: 'No I/O connections established',
  0b0100: 'Non-volatile configuration bad',
  0b0101: 'Major fault - either bit 10 or bit 11 is true (1)',
  0b0110: 'At least one I/O connection in run mode',
  0b0111: 'At least one I/O connection established, all in idle mode'
};


// // CIP Vol7 Table 5-2.1, Attribute 18
// function ModbusIdentityInfoParser(res, buffer, offset) {
//   /*
//     Struct of:
//     VendorName [SHORT_STRING]
//     ProductCode [SHORT_STRING]
//     MajorMinorRevsion [SHORT_STRING]
//     VendorUrl [SHORT_STRING]
//     ProductName [SHORT_STRING]
//     ModelName [SHORT_STRING]
//     UserAppName [SHORT_STRING]
//   */
// }


module.exports = Identity;