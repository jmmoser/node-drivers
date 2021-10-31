import CIPMetaObject from '../object.js';
import CIPAttribute from '../attribute.js';

import {
  ClassCodes,
  VendorNames,
} from '../constants/index.js';

import { DataType } from '../datatypes/index.js';
import { getBits } from '../../../utils.js';

// CIP Vol1 Table 5-2.2, Attribute ID 8, Semantics of Values
const InstanceStateDescriptions = {
  0: 'Non-existent',
  1: 'Device self testing',
  2: 'Standby',
  3: 'Operational',
  4: 'Major recoverable fault',
  5: 'Major unrecoverable fault',
  255: 'Default for Get_Attributes_All service',
};

// CIP Vol1 Table 5-2.4
const ExtendedDeviceStatusDescriptions = {
  0b0000: 'Self-testing or unknown',
  0b0001: 'Firmware update in progress',
  0b0010: 'At least one faulted I/O connection',
  0b0011: 'No I/O connections established',
  0b0100: 'Non-volatile configuration bad',
  0b0101: 'Major fault - either bit 10 or bit 11 is true (1)',
  0b0110: 'At least one I/O connection in run mode',
  0b0111: 'At least one I/O connection established, all in idle mode',
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
  OBSOLETEPneumaticValve: 0x19,
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
  [DeviceTypeCodes.OBSOLETEPneumaticValve]: '(OBSOLETE) Pneumatic Valve(s)',
};

const ClassAttribute = Object.freeze({});

const LanguageDataType = DataType.TRANSFORM(
  DataType.STRUCT([DataType.USINT, DataType.USINT, DataType.USINT]),
  (value) => value.map((v) => String.fromCharCode(v)).join(''),
);

const InstanceAttribute = Object.freeze({
  VendorID: new CIPAttribute.Instance(1, 'Vendor ID', DataType.TRANSFORM(
    DataType.UINT,
    (value) => ({
      code: value,
      name: VendorNames[value] || 'Unknown',
    }),
  )),
  DeviceType: new CIPAttribute.Instance(2, 'Device Type', DataType.TRANSFORM(
    DataType.UINT,
    (value) => ({
      code: value,
      name: DeviceTypeNames[value] || 'Unknown',
    }),
  )),
  ProductCode: new CIPAttribute.Instance(3, 'Product Code', DataType.UINT),
  Revision: new CIPAttribute.Instance(4, 'Revision', DataType.TRANSFORM(
    DataType.STRUCT([DataType.USINT, DataType.USINT]),
    (value) => ({
      major: value[0],
      minor: value[1],
    }),
  )),
  Status: new CIPAttribute.Instance(5, 'Status', DataType.TRANSFORM(
    DataType.WORD,
    (value) => ({
      code: value,
      owned: getBits(value, 0, 1),
      configured: getBits(value, 3, 4),
      extendedDeviceStatus: ExtendedDeviceStatusDescriptions[getBits(value, 4, 8)] || 'Vendor/Product specific',
      minorRecoverableFault: getBits(value, 8, 9),
      minorUnrecoverableFault: getBits(value, 9, 10),
      majorRecoverableFault: getBits(value, 10, 11),
      majorUnrecoverableFault: getBits(value, 11, 12),
    }),
  )),
  SerialNumber: new CIPAttribute.Instance(6, 'Serial Number', DataType.UDINT),
  ProductName: new CIPAttribute.Instance(7, 'Product Name', DataType.SHORT_STRING),
  State: new CIPAttribute.Instance(8, 'State', DataType.TRANSFORM(
    DataType.USINT,
    (value) => InstanceStateDescriptions[value] || 'Reserved',
  )),
  ConfigurationConsistencyValue: new CIPAttribute.Instance(9, 'Configuration Consistency Value', DataType.UINT),
  HeartbeatInterval: new CIPAttribute.Instance(10, 'Heartbeat Interval', DataType.USINT),
  ActiveLanguage: new CIPAttribute.Instance(11, 'Active Language', LanguageDataType),
  SupportedLanguageList: new CIPAttribute.Instance(12, 'Supported Language List', DataType.ABBREV_ARRAY(LanguageDataType, true)),
  InternationalProductName: new CIPAttribute.Instance(13, 'International Product Name', DataType.STRINGI),
  Semaphore: new CIPAttribute.Instance(14, 'Semaphore', DataType.STRUCT([DataType.UINT, DataType.UDINT, DataType.ITIME])),
  AssignedName: new CIPAttribute.Instance(15, 'Assigned Name', DataType.STRINGI),
  AssignedDescription: new CIPAttribute.Instance(16, 'Assigned Description', DataType.STRINGI),
  GeographicLocation: new CIPAttribute.Instance(17, 'Geographic Location', DataType.STRINGI),
  // ModbusIdentityInfo: new CIPAttribute.Instance(18)
});

const GetAttributesAllInstanceAttributes = [
  InstanceAttribute.VendorID,
  InstanceAttribute.DeviceType,
  InstanceAttribute.ProductCode,
  InstanceAttribute.Revision,
  InstanceAttribute.Status,
  InstanceAttribute.SerialNumber,
  InstanceAttribute.ProductName,
];

const CIPObject = CIPMetaObject(ClassCodes.Identity, {
  ClassAttributes: ClassAttribute,
  InstanceAttributes: InstanceAttribute,
  GetAttributesAllInstanceAttributes,
});

class Identity extends CIPObject {}

Identity.ClassAttribute = ClassAttribute;
Identity.InstanceAttribute = InstanceAttribute;

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

Identity.DeviceType = DeviceTypeCodes;

export default Identity;
