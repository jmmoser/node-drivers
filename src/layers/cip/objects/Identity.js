'use strict';

const CIPMetaObject = require('../core/object');
const CIPAttribute = require('../core/attribute');
const CIPFeatureGroup = require('../core/featuregroup');

const {
  ClassCodes,
  VendorNames
} = require('../core/constants');

const { DataType } = require('../datatypes');
const { getBits } = require('../../../utils');


const CLASS_CODE = ClassCodes.Identity;

const ClassAttribute = Object.freeze({});

const LanguageDataType = DataType.TRANSFORM(
  DataType.STRUCT([DataType.USINT, DataType.USINT, DataType.USINT]),
  value => value.map(v => String.fromCharCode(v)).join('')
);

const InstanceAttribute = Object.freeze({
  VendorID: new CIPAttribute.Instance(1, 'Vendor ID', DataType.TRANSFORM(
    DataType.UINT,
    value => ({
      id: value,
      name: VendorNames[value] || 'Unknown'
    })
  )),
  DeviceType: new CIPAttribute.Instance(2, 'Device Type', DataType.TRANSFORM(
    DataType.UINT,
    value => ({
      code: value,
      name: DeviceTypeNames[value] || 'Unknown'
    })
  )),
  ProductCode: new CIPAttribute.Instance(3, 'Product Code', DataType.UINT),
  Revision: new CIPAttribute.Instance(4, 'Revision', DataType.TRANSFORM(
    DataType.STRUCT([DataType.USINT, DataType.USINT]),
    value => ({
      major: value[0],
      minor: value[1]
    })
  )),
  Status: new CIPAttribute.Instance(5, 'Status', DataType.TRANSFORM(
    DataType.WORD,
    value => ({
      code: value,
      owned: getBits(value, 0, 1),
      configured: getBits(value, 3, 4),
      extendedDeviceStatus: ExtendedDeviceStatusDescriptions[getBits(value, 4, 8)] || 'Vendor/Product specific',
      minorRecoverableFault: getBits(value, 8, 9),
      minorUnrecoverableFault: getBits(value, 9, 10),
      majorRecoverableFault: getBits(value, 10, 11),
      majorUnrecoverableFault: getBits(value, 11, 12)
    })
  )),
  SerialNumber: new CIPAttribute.Instance(6, 'Serial Number', DataType.UDINT),
  ProductName: new CIPAttribute.Instance(7, 'Product Name', DataType.SHORT_STRING),
  State: new CIPAttribute.Instance(8, 'State', DataType.TRANSFORM(
    DataType.USINT,
    value => InstanceStateDescriptions[value] || 'Reserved'
  )),
  ConfigurationConsistencyValue: new CIPAttribute.Instance(9, 'Configuration Consistency Value', DataType.UINT),
  HeartbeatInterval: new CIPAttribute.Instance(10, 'Heartbeat Interval', DataType.USINT),
  ActiveLanguage: new CIPAttribute.Instance(11, 'Active Language', LanguageDataType),
  SupportedLanguageList: new CIPAttribute.Instance(12, 'Supported Language List', DataType.ABBREV_ARRAY(LanguageDataType, true)),
  InternationalProductName: new CIPAttribute.Instance(13, 'International Product Name', DataType.STRINGI),
  Semaphore: new CIPAttribute.Instance(14, 'Semaphore', DataType.STRUCT([DataType.UINT, DataType.UDINT, DataType.ITIME])),
  AssignedName: new CIPAttribute.Instance(15, 'Assigned Name', DataType.STRINGI),
  AssignedDescription: new CIPAttribute.Instance(16, 'Assigned Description', DataType.STRINGI),
  GeographicLocation: new CIPAttribute.Instance(17, 'Geographic Location', DataType.STRINGI)
  // ModbusIdentityInfo: new CIPAttribute.Instance(18)
});

const GetAttributesAllInstanceAttributes = [
  InstanceAttribute.VendorID,
  InstanceAttribute.DeviceType,
  InstanceAttribute.ProductCode,
  InstanceAttribute.Revision,
  InstanceAttribute.Status,
  InstanceAttribute.SerialNumber,
  InstanceAttribute.ProductName
];


const CIPObject = CIPMetaObject(
  CLASS_CODE,
  new CIPFeatureGroup(Object.values(ClassAttribute)),
  new CIPFeatureGroup(Object.values(InstanceAttribute)),
  {
    GetAttributesAllInstanceAttributes
  }
);


class Identity extends CIPObject {
  // static DecodeGetClassAttributesAll(data, offset, cb) {
  //   const info = {};
  //   info.data = data;
  //   const length = data.length;

  //   if (offset < length - 1) {
  //     offset = Decode(DataType.UINT, data, offset, val => info.vendorID = val);
  //   }

  //   if (offset < length - 1) {
  //     offset = Decode(DataType.UINT, data, offset, val => info.maxInstanceID = val);
  //   }

  //   if (offset < length - 1) {
  //     offset = Decode(DataType.UINT, data, offset, val => info.numberOfInstances = val);
  //   }

  //   if (offset < length - 1) {
  //     let numberOfOptionalAttributes;
  //     offset = Decode(DataType.UINT, data, offset, val => numberOfOptionalAttributes = val);

  //     info.optionalAttributes = [];
  //     for (let i = 0; i < numberOfOptionalAttributes; i++) {
  //       if (offset < length - 1) {
  //         offset = Decode(DataType.UINT, data, offset, val => info.optionalAttributes.push(val));
  //       } else {
  //         // console.log('breaking optional attributes');
  //         break;
  //       }
  //     }
  //   }

  //   if (offset < length - 1) {
  //     let numberOfOptionalServices;
  //     offset = Decode(DataType.UINT, data, offset, val => numberOfOptionalServices = val);

  //     info.optionalServices = [];
  //     for (let i = 0; i < numberOfOptionalServices; i++) {
  //       if (offset < length - 1) {
  //         offset = Decode(DataType.UINT, data, offset, val => info.optionalServices.push({
  //           code: val,
  //           name: CommonServiceNames[val] || 'Unknown',
  //           hex: `0x${val.toString('16')}`
  //         }));
  //       } else {
  //         // console.log('breaking optional services');
  //         break;
  //       }
  //     }
  //   }

  //   if (offset < length - 1) {
  //     offset = Decode(DataType.UINT, data, offset, val => info.maxIDNumberOfClassAttributes = val);
  //   }

  //   if (offset < length - 1) {
  //     offset = Decode(DataType.UINT, data, offset, val => info.maxIDNumberOfInstanceAttributes = val);
  //   }

  //   info.extra = data.slice(offset);

  //   if (typeof cb === 'function') {
  //     cb(info);
  //   }

  //   return offset;
  // }
}

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

/** CIP Vol 1, Table 6-7.1 */
const DeviceTypeCodes = {
  ACDrives: 0x02,
  ModbusDevice: 0x28,
  CIPMotionDrive: 0x25,
  CommunicationsAdapter: 0x0C,
  CompoNetRepeater: 0x26,
  Contactor: 0x15,
  ControlNetPhysicalLayerComponent: 0x32,
  ProgrammableLogicController: 0x0E,
  DCDrives: 0x13,
  DCPowerGenerator: 0x1F,
  Encoder: 0x22,
  FluidFlowController: 0x24,
  GeneralPurposeDiscreteIO: 0x07,
  GenericDevice: 0x00,
  HumanMachineInterface: 0x18,
  InductiveProximitySwitch: 0x05,
  LimitSwitch: 0x04,
  MassFlowController: 0x1A,
  MassFlowControllerEnhanced: 0x27,
  MotorOverload: 0x03,
  MotorStarter: 0x16,
  PhotoelectricSensor: 0x06,
  PneumaticValve: 0x1B,
  PositionController: 0x10,
  ProcessControlValve: 0x1D,
  ResidualGasAnalyzer: 0x1E,
  Resolver: 0x09,
  RFPowerGenerator: 0x20,
  SafetyDiscreteIODevice: 0x23,
  SoftstartStarter: 0x17,
  TurbomolecularVacuumPump: 0x21,
  VacuumPressureGauge: 0x1C,

  /** OBSOLETE DEVICE PROFILES */
  OBSOLETEControlStation: 0x01,
  OBSOLETEEncoder: 0x08,
  OBSOLETEGeneralPurposeAnalogIO: 0x0A,
  OBSOLETEBarcodeScanner: 0x0D,
  OBSOLETEWeightScale: 0x11,
  OBSOLETEMessageDisplay: 0x12,
  OBSOLETEServoDrives: 0x14,
  OBSOLETEPneumaticValve: 0x19
};

/** CIP Vol 1, Table 6-7.1 */
const DeviceTypeNames = {
  [DeviceTypeCodes.ACDrives]: 'AC Drives',
  [DeviceTypeCodes.ModbusDevice]: 'Modbus Device',
  [DeviceTypeCodes.CIPMotionDrive]: 'CIP Motion Drive',
  [DeviceTypeCodes.CommunicationsAdapter]: 'Communications Adapter',
  [DeviceTypeCodes.CompoNetRepeater]: 'CompoNet Repeater',
  [DeviceTypeCodes.Contactor]: 'Contactor',
  [DeviceTypeCodes.ControlNetPhysicalLayerComponent]: 'ControlNet Physical Layer Component',
  [DeviceTypeCodes.ProgrammableLogicController]: 'Programmable Logic Controller',
  [DeviceTypeCodes.DCDrives]: 'DC Drives',
  [DeviceTypeCodes.DCPowerGenerator]: 'DC Power Generator',
  [DeviceTypeCodes.Encoder]: 'Encoder',
  [DeviceTypeCodes.FluidFlowController]: 'Fluid Flow Controller',
  [DeviceTypeCodes.GeneralPurposeDiscreteIO]: 'General Purpose Discrete I/O',
  [DeviceTypeCodes.GenericDevice]: 'Generic Device',
  [DeviceTypeCodes.HumanMachineInterface]: 'Human-Machine Interface',
  [DeviceTypeCodes.InductiveProximitySwitch]: 'Inductive Proximity Switch',
  [DeviceTypeCodes.LimitSwitch]: 'Limit Switch',
  [DeviceTypeCodes.MassFlowController]: 'Mass Flow Controller',
  [DeviceTypeCodes.MassFlowControllerEnhanced]: 'Mass Flow Controller, Enhanced',
  [DeviceTypeCodes.MotorOverload]: 'Motor Overload',
  [DeviceTypeCodes.MotorStarter]: 'Motor Starter',
  [DeviceTypeCodes.PhotoelectricSensor]: 'Photoelectric Sensor',
  [DeviceTypeCodes.PneumaticValve]: 'Pneumatic Valve(s)',
  [DeviceTypeCodes.PositionController]: 'Position Controller',
  [DeviceTypeCodes.ProcessControlValve]: 'Process Control Valve',
  [DeviceTypeCodes.ResidualGasAnalyzer]: 'Residual Gas Analyzer',
  [DeviceTypeCodes.Resolver]: 'Resolver',
  [DeviceTypeCodes.RFPowerGenerator]: 'RF Power Generator',
  [DeviceTypeCodes.SafetyDiscreteIODevice]: 'Safety Discrete I/O Device',
  [DeviceTypeCodes.SoftstartStarter]: 'Softstart Starter',
  [DeviceTypeCodes.TurbomolecularVacuumPump]: 'Turbomolecular Vacuum Pump',
  [DeviceTypeCodes.VacuumPressureGauge]: 'Vacuum Pressure Gauge',

  /** OBSOLETE DEVICE PROFILES */
  [DeviceTypeCodes.OBSOLETEControlStation]: '(OBSOLETE) Control Station',
  [DeviceTypeCodes.OBSOLETEEncoder]: '(OBSOLETE) Encoder',
  [DeviceTypeCodes.OBSOLETEGeneralPurposeAnalogIO]: '(OBSOLETE) General Purpose Analog I/O',
  [DeviceTypeCodes.OBSOLETEBarcodeScanner]: '(OBSOLETE) Barcode Scanner',
  [DeviceTypeCodes.OBSOLETEWeightScale]: '(OBSOLETE) Weight Scale',
  [DeviceTypeCodes.OBSOLETEMessageDisplay]: '(OBSOLETE) Message Display',
  [DeviceTypeCodes.OBSOLETEServoDrives]: '(OBSOLETE) Servo Drives',
  [DeviceTypeCodes.OBSOLETEPneumaticValve]: '(OBSOLETE) Pneumatic Valve(s)'
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

Identity.InstanceAttribute = InstanceAttribute;
Identity.ClassAttribute = ClassAttribute;


module.exports = Identity;






// 'use strict';

// const { Decode, DataType } = require('../datatypes');
// const { getBit, getBits, InvertKeyValues } = require('../../../utils');

// class Identity {
//   static DecodeInstanceAttribute(attribute, data, offset, cb) {
//     const dataType = InstanceAttributeDataTypes[attribute];
//     if (!dataType) {
//       throw new Error(`Unknown instance attribute: ${attribute}`);
//     }

//     let value;
//     offset = Decode(dataType, data, offset, val => value = val);

//     switch (attribute) {
//       case InstanceAttributeCodes.DeviceType: {
//         value = {
//           code: value,
//           name: DeviceTypeNames[value] || 'Unknown'
//         };
//         break;
//       }
//       case InstanceAttributeCodes.Revision: {
//         if (Array.isArray(value) && value.length >= 2) {
//           value = {
//             major: value[0],
//             minor: value[1]
//           };
//         }
//         break;
//       }
//       case InstanceAttributeCodes.Status: {
//         /** CIP Vol 1, Table 5-2.3 */
//         value = {
//           code: value,
//           owned: getBit(value, 0),
//           configured: getBit(value, 3),
//           extendedDeviceStatus: ExtendedDeviceStatusDescriptions[getBits(value, 4, 8)] || 'Vendor/Product specific',
//           minorRecoverableFault: getBit(value, 8),
//           minorUnrecoverableFault: getBit(value, 9),
//           majorRecoverableFault: getBit(value, 10),
//           majorUnrecoverableFault: getBit(value, 11)
//         };
//         break;
//       }
//       case InstanceAttributeCodes.State: {
//         value = {
//           code: value,
//           description: InstanceStateDescriptions[value] || 'Reserved'
//         }
//         break;
//       }
//       default:
//         break;
//     }

//     if (typeof cb === 'function') {
//       cb({
//         code: attribute,
//         name: InstanceAttributeNames[attribute] || 'Unknown',
//         value
//       });
//     }

//     return offset;
//   }


//   static DecodeInstanceAttributesAll(buffer, offset, cb) {
//     const attributes = [
//       InstanceAttributeCodes.VendorID,
//       InstanceAttributeCodes.DeviceType,
//       InstanceAttributeCodes.ProductCode,
//       InstanceAttributeCodes.Revision,
//       InstanceAttributeCodes.Status,
//       InstanceAttributeCodes.SerialNumber,
//       InstanceAttributeCodes.ProductName
//     ].reduce((accum, attribute) => {
//       offset = this.DecodeInstanceAttribute(attribute, buffer, offset, val => accum.push(val));
//       return accum;
//     }, []);

//     if (typeof cb === 'function') {
//       cb(attributes);
//     }

//     return offset;
//   }


//   static get Services() {
//     return ClassServices;
//   }


//   static DecodeGetClassAttributesAll(data, offset, cb) {
//     const info = {};
//     info.data = data;
//     const length = data.length;

//     if (offset < length - 1) {
//       offset = Decode(DataType.UINT, data, offset, val => info.vendorID = val);
//     }

//     if (offset < length - 1) {
//       offset = Decode(DataType.UINT, data, offset, val => info.maxInstanceID = val);
//     }

//     if (offset < length - 1) {
//       offset = Decode(DataType.UINT, data, offset, val => info.numberOfInstances = val);
//     }

//     if (offset < length - 1) {
//       let numberOfOptionalAttributes;
//       offset = Decode(DataType.UINT, data, offset, val => numberOfOptionalAttributes = val);

//       info.optionalAttributes = [];
//       for (let i = 0; i < numberOfOptionalAttributes; i++) {
//         if (offset < length - 1) {
//           offset = Decode(DataType.UINT, data, offset, val => info.optionalAttributes.push(val));
//         } else {
//           // console.log('breaking optional attributes');
//           break;
//         }
//       }

//       // console.log({
//       //   numberOfOptionalAttributes,
//       //   length: info.optionalAttributes.length
//       // });
//     }

//     if (offset < length - 1) {
//       let numberOfOptionalServices;
//       offset = Decode(DataType.UINT, data, offset, val => numberOfOptionalServices = val);

//       info.optionalServices = [];
//       for (let i = 0; i < numberOfOptionalServices; i++) {
//         if (offset < length - 1) {
//           offset = Decode(DataType.UINT, data, offset, val => info.optionalServices.push({
//             code: val,
//             name: CommonServiceNames[val] || 'Unknown',
//             hex: `0x${val.toString('16')}`
//           }));
//         } else {
//           // console.log('breaking optional services');
//           break;
//         }
//       }

//       // console.log({
//       //   numberOfOptionalServices,
//       //   length: info.optionalServices.length
//       // });
//     }

//     if (offset < length - 1) {
//       offset = Decode(DataType.UINT, data, offset, val => info.maxIDNumberOfClassAttributes = val);
//     }

//     if (offset < length - 1) {
//       offset = Decode(DataType.UINT, data, offset, val => info.maxIDNumberOfInstanceAttributes = val);
//     }

//     info.extra = data.slice(offset);

//     if (typeof cb === 'function') {
//       cb(info);
//     }

//     // console.log(data.readUInt16LE(length - 4));
//     // console.log(data.readUInt16LE(length - 2));
//     // console.log(data.slice(length - 8));

//     return offset;
//   }
// }


// const ClassServices = {
//   GetAttributesAll: 0x01,
//   Reset: 0x05,
//   GetAttributeSingle: 0x0E,
//   SetAttributeSingle: 0x10,
//   FindNextObjectInstance: 0x11
// };

// // CIP Vol1 5-2
// Identity.Code = 0x01;


// // CIP Vol1 Table 5-2.2
// const InstanceAttributeCodes = {
//   VendorID: 1,
//   DeviceType: 2,
//   ProductCode: 3,
//   Revision: 4,
//   Status: 5,
//   SerialNumber: 6,
//   ProductName: 7,
//   State: 8,
//   ConfigurationConsistencyValue: 9,
//   HeartbeatInterval: 10,
//   ActiveLanguage: 11,
//   SupportedLanguageList: 12,
//   InternationalProductName: 13,
//   Semaphore: 14,
//   AssignedName: 15,
//   AssignedDescription: 16,
//   GeographicLocation: 17,
//   ModbusIdentityInfo: 18
// };

// Identity.InstanceAttribute = InstanceAttributeCodes;

// const InstanceAttributeNames = InvertKeyValues(InstanceAttributeCodes);


// const InstanceAttributeDataTypes = {
//   [InstanceAttributeCodes.VendorID]: DataType.UINT,
//   [InstanceAttributeCodes.DeviceType]: DataType.UINT,
//   [InstanceAttributeCodes.ProductCode]: DataType.UINT,
//   [InstanceAttributeCodes.Revision]: DataType.STRUCT([DataType.USINT, DataType.USINT]),
//   [InstanceAttributeCodes.Status]: DataType.WORD,
//   [InstanceAttributeCodes.SerialNumber]: DataType.UDINT,
//   [InstanceAttributeCodes.ProductName]: DataType.SHORT_STRING,
//   [InstanceAttributeCodes.State]: DataType.USINT,
//   [InstanceAttributeCodes.ConfigurationConsistencyValue]: DataType.UINT,
//   [InstanceAttributeCodes.HeartbeatInterval]: DataType.USINT,
//   [InstanceAttributeCodes.ActiveLanguage]: DataType.STRUCT([DataType.USINT, DataType.USINT, DataType.USINT]),
//   [InstanceAttributeCodes.SupportedLanguageList]: DataType.ABBREV_ARRAY(DataType.STRUCT([DataType.USINT, DataType.USINT, DataType.USINT])),
//   [InstanceAttributeCodes.InternationalProductName]: DataType.STRINGI,
//   [InstanceAttributeCodes.Semaphore]: DataType.STRUCT([DataType.UINT, DataType.UDINT, DataType.ITIME]),
//   [InstanceAttributeCodes.AssignedName]: DataType.STRINGI,
//   [InstanceAttributeCodes.AssignedDescription]: DataType.STRINGI,
//   [InstanceAttributeCodes.GeographicLocation]: DataType.STRING,
//   // [InstanceAttributeCodes.ModbusIdentityInfo]: /** See CIP Vol 7, Chapter 5 */
// };


// // CIP Vol1 Table 5-2.2, Attribute ID 8, Semantics of Values
// const InstanceStateDescriptions = {
//   0: 'Non-existent',
//   1: 'Device self testing',
//   2: 'Standby',
//   3: 'Operational',
//   4: 'Major recoverable fault',
//   5: 'Major unrecoverable fault',
//   255: 'Default for Get_Attributes_All service'
// };

// Identity.InstanceStateDescriptions = InstanceStateDescriptions;


// // CIP Vol1 Table 5-2.4
// const ExtendedDeviceStatusDescriptions = {
//   0b0000: 'Self-testing or unknown',
//   0b0001: 'Firmware update in progress',
//   0b0010: 'At least one faulted I/O connection',
//   0b0011: 'No I/O connections established',
//   0b0100: 'Non-volatile configuration bad',
//   0b0101: 'Major fault - either bit 10 or bit 11 is true (1)',
//   0b0110: 'At least one I/O connection in run mode',
//   0b0111: 'At least one I/O connection established, all in idle mode'
// };

// /** CIP Vol 1, Table 6-7.1 */
// const DeviceTypeCodes = {
//   ACDrives: 0x02,
//   ModbusDevice: 0x28,
//   CIPMotionDrive: 0x25,
//   CommunicationsAdapter: 0x0C,
//   CompoNetRepeater: 0x26,
//   Contactor: 0x15,
//   ControlNetPhysicalLayerComponent: 0x32,
//   ProgrammableLogicController: 0x0E,
//   DCDrives: 0x13,
//   DCPowerGenerator: 0x1F,
//   Encoder: 0x22,
//   FluidFlowController: 0x24,
//   GeneralPurposeDiscreteIO: 0x07,
//   GenericDevice: 0x00,
//   HumanMachineInterface: 0x18,
//   InductiveProximitySwitch: 0x05,
//   LimitSwitch: 0x04,
//   MassFlowController: 0x1A,
//   MassFlowControllerEnhanced: 0x27,
//   MotorOverload: 0x03,
//   MotorStarter: 0x16,
//   PhotoelectricSensor: 0x06,
//   PneumaticValve: 0x1B,
//   PositionController: 0x10,
//   ProcessControlValve: 0x1D,
//   ResidualGasAnalyzer: 0x1E,
//   Resolver: 0x09,
//   RFPowerGenerator: 0x20,
//   SafetyDiscreteIODevice: 0x23,
//   SoftstartStarter: 0x17,
//   TurbomolecularVacuumPump: 0x21,
//   VacuumPressureGauge: 0x1C,

//   /** OBSOLETE DEVICE PROFILES */
//   OBSOLETEControlStation: 0x01,
//   OBSOLETEEncoder: 0x08,
//   OBSOLETEGeneralPurposeAnalogIO: 0x0A,
//   OBSOLETEBarcodeScanner: 0x0D,
//   OBSOLETEWeightScale: 0x11,
//   OBSOLETEMessageDisplay: 0x12,
//   OBSOLETEServoDrives: 0x14,
//   OBSOLETEPneumaticValve: 0x19
// };

// /** CIP Vol 1, Table 6-7.1 */
// const DeviceTypeNames = {
//   [DeviceTypeCodes.ACDrives]: 'AC Drives',
//   [DeviceTypeCodes.ModbusDevice]: 'Modbus Device',
//   [DeviceTypeCodes.CIPMotionDrive]: 'CIP Motion Drive',
//   [DeviceTypeCodes.CommunicationsAdapter]: 'Communications Adapter',
//   [DeviceTypeCodes.CompoNetRepeater]: 'CompoNet Repeater',
//   [DeviceTypeCodes.Contactor]: 'Contactor',
//   [DeviceTypeCodes.ControlNetPhysicalLayerComponent]: 'ControlNet Physical Layer Component',
//   [DeviceTypeCodes.ProgrammableLogicController]: 'Programmable Logic Controller',
//   [DeviceTypeCodes.DCDrives]: 'DC Drives',
//   [DeviceTypeCodes.DCPowerGenerator]: 'DC Power Generator',
//   [DeviceTypeCodes.Encoder]: 'Encoder',
//   [DeviceTypeCodes.FluidFlowController]: 'Fluid Flow Controller',
//   [DeviceTypeCodes.GeneralPurposeDiscreteIO]: 'General Purpose Discrete I/O',
//   [DeviceTypeCodes.GenericDevice]: 'Generic Device',
//   [DeviceTypeCodes.HumanMachineInterface]: 'Human-Machine Interface',
//   [DeviceTypeCodes.InductiveProximitySwitch]: 'Inductive Proximity Switch',
//   [DeviceTypeCodes.LimitSwitch]: 'Limit Switch',
//   [DeviceTypeCodes.MassFlowController]: 'Mass Flow Controller',
//   [DeviceTypeCodes.MassFlowControllerEnhanced]: 'Mass Flow Controller, Enhanced',
//   [DeviceTypeCodes.MotorOverload]: 'Motor Overload',
//   [DeviceTypeCodes.MotorStarter]: 'Motor Starter',
//   [DeviceTypeCodes.PhotoelectricSensor]: 'Photoelectric Sensor',
//   [DeviceTypeCodes.PneumaticValve]: 'Pneumatic Valve(s)',
//   [DeviceTypeCodes.PositionController]: 'Position Controller',
//   [DeviceTypeCodes.ProcessControlValve]: 'Process Control Valve',
//   [DeviceTypeCodes.ResidualGasAnalyzer]: 'Residual Gas Analyzer',
//   [DeviceTypeCodes.Resolver]: 'Resolver',
//   [DeviceTypeCodes.RFPowerGenerator]: 'RF Power Generator',
//   [DeviceTypeCodes.SafetyDiscreteIODevice]: 'Safety Discrete I/O Device',
//   [DeviceTypeCodes.SoftstartStarter]: 'Softstart Starter',
//   [DeviceTypeCodes.TurbomolecularVacuumPump]: 'Turbomolecular Vacuum Pump',
//   [DeviceTypeCodes.VacuumPressureGauge]: 'Vacuum Pressure Gauge',

//   /** OBSOLETE DEVICE PROFILES */
//   [DeviceTypeCodes.OBSOLETEControlStation]: '(OBSOLETE) Control Station',
//   [DeviceTypeCodes.OBSOLETEEncoder]: '(OBSOLETE) Encoder',
//   [DeviceTypeCodes.OBSOLETEGeneralPurposeAnalogIO]: '(OBSOLETE) General Purpose Analog I/O',
//   [DeviceTypeCodes.OBSOLETEBarcodeScanner]: '(OBSOLETE) Barcode Scanner',
//   [DeviceTypeCodes.OBSOLETEWeightScale]: '(OBSOLETE) Weight Scale',
//   [DeviceTypeCodes.OBSOLETEMessageDisplay]: '(OBSOLETE) Message Display',
//   [DeviceTypeCodes.OBSOLETEServoDrives]: '(OBSOLETE) Servo Drives',
//   [DeviceTypeCodes.OBSOLETEPneumaticValve]: '(OBSOLETE) Pneumatic Valve(s)'
// };


// // // CIP Vol7 Table 5-2.1, Attribute 18
// // function ModbusIdentityInfoParser(res, buffer, offset) {
// //   /*
// //     Struct of:
// //     VendorName [SHORT_STRING]
// //     ProductCode [SHORT_STRING]
// //     MajorMinorRevsion [SHORT_STRING]
// //     VendorUrl [SHORT_STRING]
// //     ProductName [SHORT_STRING]
// //     ModelName [SHORT_STRING]
// //     UserAppName [SHORT_STRING]
// //   */
// // }


// module.exports = Identity;