'use strict';

const CIP = require('./CIP');
const { getBit, getBits, InvertKeyValues } = require('../../util');

// Class Code 0x01
class Identity {
  // GetAttributeSingle() {
  //   // 0x0E
  // }

  // Reset() {
  //   // 0x05
  // }

  // GetAttributesAll() {
  //   // 0x01
  // }

  // SetAttributeSingle() {
  //   // 0x10
  // }

  static ParseInstanceAttributesAll(buffer, offset, cb) {
    let error;
    const item = {};

    item.vendorID = buffer.readUInt16LE(offset); offset += 2;
    item.deviceType = buffer.readUInt16LE(offset); offset += 2;
    item.productCode = buffer.readUInt16LE(offset); offset += 2;

    item.revision = {};
    item.revision.major = buffer.readUInt8(offset); offset += 1;
    item.revision.minor = buffer.readUInt8(offset); offset += 1;

    offset = this.ParseInstanceAttributeStatus(buffer, offset, (err, value) => {
      if (err) {
        error = err;
      } else {
        item.status = value;
      }
    });

    if (error) {
      cb(error);
      return offset;
    }

    item.serialNumber = buffer.readUInt32LE(offset); offset += 4;

    offset = CIP.DecodeValue(CIP.DataTypes.SHORT_STRING, buffer, offset, (err, value) => {
      if (err) {
        error = err;
      } else {
        item.productName = value;
      }
    });

    if (error) {
      cb(error);
      return offset;
    }

    cb(null, item);
    
    return offset;
  }

  // CIP Vol1 Table 5-2.3
  static ParseInstanceAttributeStatus(buffer, offset, cb) {
    const code = buffer.readUInt16LE(offset); offset += 2;

    const status = {
      code,
      owned: getBit(code, 0),
      configured: getBit(code, 3),
      extendedDeviceStatus: ExtendedDeviceStatusDescription(code), // bits 4 - 7
      minorRecoverableFault: getBit(code, 8),
      minorUnrecoverableFault: getBit(code, 9),
      majorRecoverableFault: getBit(code, 10),
      majorUnrecoverableFault: getBit(code, 11)
    };

    cb(null, status);

    return offset;
  }

  static ParseInstanceAttributeState(buffer, offset, cb) {
    const code = buffer.readUInt8(offset); offset += 1;
    const state = {
      code,
      description: InstanceStateDescriptions[code] || 'unknown'
    };

    cb(null, state);

    return offset;
  }

  static get Services() {
    return ClassServices;
  }
}

module.exports = Identity;

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
const InstanceAttributes = {
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

// const InstanceAttributeNames = InvertKeyValues(InstanceAttributes);


// // CIP Vol1 Table 5-2.2
// const InstanceAttributeInfo = {
//   1: { name: 'VendorID', type: 'UINT' },
//   2: { name: 'Device Type', type: 'UINT' },
//   3: { name: 'Product Code', type: 'UINT' },
//   4: { name: 'Revision', type: 'STRUCT' },
//   5: { name: 'Status', type: 'WORD', },
//   6: { name: 'Serial Number', type: 'UDINT' },
//   7: { name: 'Product Name', type: 'SHORT_STRING' },
//   8: { name: 'State', type: 'USINT'},
//   9: { name: 'Configuration Consistency Value', type: 'UINT' },
//   10: { name: 'Heartbeat Interval', type: 'USINT' },
//   11: { name: 'Active Language', type: 'STRUCT' },
//   12: { name: 'Supported Language List', type: 'ARRAY STRUCT'},
//   13: { name: 'International Product Name', type: 'STRINGI' },
//   14: { name: 'Semaphore', type: 'STRUCT' },
//   15: { name: 'Assigned_Name', type: 'STRINGI' },
//   16: { name: 'Assigned_Description', type: 'STRINGI' },
//   17: { name: 'Geographic_Location', type: 'STRINGI' },
//   // 18: { name: 'Modbus Identity Info', type: 'STRUCT', parser: ModbusIdentityInfoParser }
// };

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

// CIP Vol1 Table 5-2.3
// function ParseInstanceStatus(buffer, offset, cb) {
//   const code = buffer.readUInt16LE(offset); offset += 2;

//   const status = {
//     code,
//     owned: getBit(code, 0),
//     configured: getBit(code, 3),
//     extendedDeviceStatus: ExtendedDeviceStatusDescription(code), // bits 4 - 7
//     minorRecoverableFault: getBit(code, 8),
//     minorUnrecoverableFault: getBit(code, 9),
//     majorRecoverableFault: getBit(code, 10),
//     majorUnrecoverableFault: getBit(code, 11)
//   };

//   if (typeof cb === 'function') {
//     cb(status)
//   }

//   return offset;
// }

// Identity.ParseInstanceStatus = ParseInstanceStatus;

// CIP Vol1 Table 5-2.4
const ExtendedDeviceStatusDescriptions = {
  0b0000: 'Self-testing or unknown',
  0b0001: 'Firmware update in progress',
  0b0010: 'At least one faulted I/O connection',
  0b0011: 'No I/O connections established',
  0b0100: 'Non-volatile configuration bad',
  0b0101: 'Major fault - either bit 10 or bit 11 is true (1)',
  0b0110: 'At least on I/O connection in run mode',
  0b0111: 'At least one I/O connection established, all in idle mode'
};

function ExtendedDeviceStatusDescription(status) {
  const eds = getBits(status, 4, 8);
  const desc = ExtendedDeviceStatusDescriptions[eds];
  return desc ? desc : 'Vendor/Product specific';
}


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
