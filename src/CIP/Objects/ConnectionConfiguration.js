'use strict';

const CIPObject = require('./CIPObject');

// Class code: 0xF3
class ConnectionConfiguration extends CIPObject {

  CommonServices() {
    return [0x01, 0x02, 0x09, 0x0E, 0x10, 0x15];
  }

  Services() {
    return [0x4C, 0x4D, 0x4E];
  }

  Open() {
    // 0x4C
  }
}

// ConnectionConfiguration.InstanceServices = {
//   0x01,
//   0x02,
//   0x09,
//   0x0E,
//   0x10,
//   0x15,

//   0x4C, // Open
//   0x4D, // Close
//   0x4E  // Stop
// };

// ConnectionConfiguration.ClassServices = {
//   0x01,
//   0x02,
//   0x08,
//   0x09,
//   0x0E,
//   0x10,
//   0x15,

//   0x4B, // Kick timer
//   0x4C, // Open
//   0x4D, // Close
//   0x4E, // Stop
//   0x4F, // Change Start
//   0x50, // Get Status
//   0x51, // Change Complete
//   0x52  // Audit Changes
// }

ConnectionConfiguration.Attributes = [
  // AttributeID, NeedInImplementation, AccessRule, Name, DataType, Description
  [1, true, 'Get', 'Revision', 'UINT', 'Second revision, value = 2'],
  [2, true, 'Get', 'MaxInstance', 'UDINT', 'Maximum instance number'],
  [3, true, 'Get', 'NumInstances', 'UDINT', 'Number of connections currently instantiated'],
  // 4 - 7, these class attributes are optional and are described in chapter 4 of this specification
  [8, true, 'Get', 'FormatNumber', 'UINT', 'This number determins the format of the instance attribute 9.  FormatNumbers in the range 0-99 are to be defined in this standard.  FormatNumbers in the range 100-199 are vendor specific.  All other FormatNumbers are reserved and shall not be used.'],
  [9, true, 'Set', 'EditSignature', 'UDINT', 'Created and used by configuration software to detect modifications to the instance attribute values.']
];

ConnectionConfiguration.CommonServices = [
  0x01, // GetAttributeAll
  0x02, // SetAttributeAll
  0x08,
  0x09,
  0x0E,
  0x10,
  0x15
];

ConnectionConfiguration.Services = {
  KickTimer: 0x4B,
  Open: 0x4C,
  Close: 0x4D,
  Stop: 0x4E,
  ChangeStart: 0x4F,
  GetStatus: 0x50,
  ChangeComplete: 0x51,
  AuditChanges: 0x52
};

ConnectionConfiguration.ServiceDescriptions = {
  0x4B: 'Kicks edit watchdog timer',
  0x4C: 'Opens connections',
  0x4D: 'Close connections',
  0x4E: 'Stops connections',
  0x4F: 'Manages session editing',
  0x50: 'Get status for multiple connections',
  0x51: 'Completes session editing',
  0x52: 'Audits pending changes'
};

module.exports = ConnectionConfiguration;
