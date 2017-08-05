'use strict';

// Class Code 0x01
class Identity {
  GetAttributeSingle() {
    // 0x0E
  }

  Reset() {
    // 0x05
  }

  GetAttributesAll() {
    // 0x01
  }

  SetAttributeSingle() {
    // 0x10
  }
}

module.exports = Identity;

Identity.ClassServices = {
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

// CIP Vol1 Table 5-2.2
const InstanceAttributeInfo = {
  1: { name: 'VendorID', type: 'UINT' },
  2: { name: 'Device Type', type: 'UINT' },
  3: { name: 'Product Code', type: 'UINT' },
  4: { name: 'Revision', type: 'STRUCT' },
  5: { name: 'Status', type: 'WORD', parser: InstanceAttributeStatusParser},
  6: { name: 'Serial Number', type: 'UDINT' },
  7: { name: 'Product Name', type: 'SHORT_STRING' },
  8: { name: 'State', type: 'USINT'},
  9: { name: 'Configuration Consistency Value', type: 'UINT' },
  10: { name: 'Heartbeat Interval', type: 'USINT' },
  11: { name: 'Active Language', type: 'STRUCT' },
  12: { name: 'Supported Language List', type: 'ARRAY STRUCT'},
  13: { name: 'International Product Name', type: 'STRINGI' },
  14: { name: 'Semaphore', type: 'STRUCT' },
  15: { name: 'Assigned_Name', type: 'STRINGI' },
  16: { name: 'Assigned_Description', type: 'STRINGI' },
  17: { name: 'Geographic_Location', type: 'STRINGI' },
  18: { name: 'Modbus Identity Info', type: 'STRUCT', parser: ModbusIdentityInfoParser}
};

// CIP Vol1 Table 5-2.2, Attribute ID 8, Semantics of Values
const StateValues = {
  0: 'Non-existent',
  1: 'Device self testing',
  2: 'Standby',
  3: 'Operational',
  4: 'Major recoverable fault',
  5: 'Major unrecoverable fault',
  255: 'Default for Get_Attributes_All service'
};

// CIP Vol1 Table 5-2.3
function InstanceAttributeStatusParser(res, buffer, offset) {
  let status = buffer.readUInt32LE(buffer, offset);

  res.Status = {
    Owner: status | (1 << 0),
    Configured: status | (1 << 2),
    ExtendedDeviceStatus: ExtendedDeviceStatusDescription(status), // bits 4 - 7
    MinorRecoverableFault: status | (1 << 8),
    MinorUnrecoverableFault: status | (1 << 9),
    MajorRecoverableFault: status | (1 << 10),
    MajorUnrecoverableFault: status | (1 << 11),
  };
}

// CIP Vol1 Table 5-2.4
const ExtendedDeviceStatusDescription = {
  0x0000: 'Self-testing or unknown',
  0x0001: 'Firmware update in progress',
  0x0010: 'At least one faulted I/O connection',
  0x0011: 'No I/O connections established',
  0x0100: 'Non-volatile configuration bad',
  0x0101: 'Major fault - either bit 10 or bit 11 is true (1)',
  0x0110: 'At least on I/O connection in run mode',
  0x0111: 'At least one I/O connection established, all in idle mode'
};

function ExtendedDeviceStatusDescription(status) {
  let eds = (status << 8) >> 12;
  let desc = ExtendedDeviceStatusDescription(eds);
  return desc ? desc : 'Vendor/product specific or unknown';
}


// CIP Vol7 Table 5-2.1, Attribute 18
function ModbusIdentityInfoParser(res, buffer, offset) {
  /*
    Struct of:
    VendorName [SHORT_STRING]
    ProductCode [SHORT_STRING]
    MajorMinorRevsion [SHORT_STRING]
    VendorUrl [SHORT_STRING]
    ProductName [SHORT_STRING]
    ModelName [SHORT_STRING]
    UserAppName [SHORT_STRING]
  */
}
