'use strict';

/** 
 * Ref. CIP Vol 1 Table 5.1
 * and https://github.com/Res260/wireshark/blob/b7107f5fcb9bcc20be33b6263f90d1b20cc1591d/epan/dissectors/packet-cip.c
 */
const Classes = {
  Identity: 0x01,
  MessageRouter: 0x02,
  DeviceNet: 0x03,
  Assembly: 0x04,
  Connection: 0x05,
  ConnectionManager: 0x06,
  Register: 0x07,
  DiscreteInputPoint: 0x08,
  DiscreteOutputPoint: 0x09,
  AnalogInputPoint: 0x0A,
  AnalogOuputPoint: 0x0B,
  PresenceSensing: 0x0E,
  Parameter: 0x0F,
  ParameterGroup: 0x10,
  Group: 0x12,
  DiscreteInputGroup: 0x1D,
  DiscreteOutputGroup: 0x1E,
  DiscreteGroup: 0x1F,
  AnalogInputGroup: 0x20,
  AnalogOutputGroup: 0x21,
  AnalogGroup: 0x22,
  PositionSensor: 0x23,
  PositionControllerSupervisor: 0x24,
  PositionController: 0x25,
  BlockSequencer: 0x26,
  CommandBlock: 0x27,
  MotorData: 0x28,
  ControlSupervisor: 0x29,
  ACDCDrive: 0x2A,
  AcknowledgeHandler: 0x2B,
  Overload: 0x2C,
  Softstart: 0x2D,
  Selection: 0x2E,
  SDeviceSupervisor: 0x30,
  SAnalogSensor: 0x31,
  SAnalogActuator: 0x32,
  SSingleStageController: 0x33,
  SGasCalibration: 0x34,
  TripPoint: 0x35,
  File: 0x37,
  SPartialPressure: 0x38,
  SafetySupervisor: 0x39,
  SafetyValidator: 0x3A,
  SafetyDiscreteOutputPoint: 0x3B,
  SafetyDiscreteOutputGroup: 0x3C,
  SafetyDiscreteInputPoint: 0x3D,
  SafetyDiscreteInputGroup: 0x3E,
  SafetyDualChannelOutput: 0x3F,
  SSensorCalibration: 0x40,
  EventLog: 0x41,
  MotionAxis: 0x42,
  TimeSync: 0x43,
  Modbus: 0x44,
  OriginatorConnectionList: 0x45,
  ModbusSerialLink: 0x46,
  DeviceLevelRing: 0x47,
  QoS: 0x48,
  SafetyAnalogInputPoint: 0x49,
  SafetyAnalogInputGroup: 0x4A,
  SafetyDualChannelAnalogInput: 0x4B,
  SERCOSIIILink: 0x4C,
  TargetConnectionList: 0x4D,
  BaseEnergy: 0x4E,
  ElectricalEnergy: 0x4F,
  NonElectricalEnergy: 0x50,
  BaseSwitch: 0x51,
  SNMP: 0x52,
  PowerManagement: 0x53,
  RSTPBridge: 0x54,
  RSTPPort: 0x55,
  PRPHSRProtocol: 0x56,
  PRPHSRNodesTable: 0x57,
  SafetyFeedback: 0x58,
  SafetyDualChannelFeedback: 0x59,
  SafetyStopFunctions: 0x5A,
  SafetyLimitFunctions: 0x5B,
  PowerCurtailment: 0x5C,
  CIPSecurity: 0x5D,
  EthernetIPSecurity: 0x5E,
  CertificateManagement: 0x5F,
  PCCC: 0x67,
  SCANportPassThroughParameter: 0x93,
  SCANportPassThroughFaultQueue: 0x97,
  SCANportPassThroughWarningQueue: 0x98,
  SCANportPassThroughLink: 0x99,
  NonVolatileStorage: 0xA1,
  ControlNet: 0xF0,
  ControlNetKeeper: 0xF1,
  ControlNetScheduling: 0xF2,
  ConnectionConfiguration: 0xF3,
  Port: 0xF4,
  TCPIPInterface: 0xF5,
  EthernetLink: 0xF6,
  CompoNetLink: 0xF7,
  CompoNetRepeater: 0xF8
};

const ClassNames = {};
Object.entries(Classes).forEach(([key, value]) => {
  ClassNames[value] = key;
});

// CIP Vol1 Appendix A
const Services = {
  GetAttributesAll: 0x01,
  SetAttributesAll: 0x02,
  GetAttributeList: 0x03,
  SetAttributeList: 0x04,
  Reset: 0x05,
  Start: 0x06,
  Stop: 0x07,
  Create: 0x08,
  Delete: 0x09,
  MultipleServicePacket: 0x0A,
  ApplyAttributes: 0x0D,
  GetAttributeSingle: 0x0E,
  SetAttributeSingle: 0x10,
  FindNextObjectInstance: 0x11,
  Restore: 0x15,
  Save: 0x16,
  NoOperation: 0x17,
  GetMember: 0x18,
  SetMember: 0x19,
  InsertMember: 0x1A,
  RemoveMember: 0x1B,
  GroupSync: 0x1C
};

// CIP Vol1 Table C-6.1
const DataType = {
  BOOL: 0xC1,
  SINT: 0xC2,
  INT: 0xC3,
  DINT: 0xC4,
  LINT: 0xC5,
  USINT: 0xC6,
  UINT: 0xC7,
  UDINT: 0xC8,
  ULINT: 0xC9,
  REAL: 0xCA,
  LREAL: 0xCB,
  STIME: 0xCC,
  DATE: 0xCD,
  TIME_OF_DAY: 0xCE,
  DATE_AND_TIME: 0xCF,
  STRING: 0xD0,
  BYTE: 0xD1,
  WORD: 0xD2,
  DWORD: 0xD3,
  LWORD: 0xD4,
  STRING2: 0xD5,
  FTIME: 0xD6,
  LTIME: 0xD7,
  ITIME: 0xD8,
  STRINGN: 0xD9,
  SHORT_STRING: 0xDA,
  TIME: 0xDB,
  EPATH: 0xDC,
  ENGUNIT: 0xDD,
  STRINGI: 0xDE
};

const DataTypeName = {};
Object.entries(DataType).forEach(([key, value]) => {
  DataTypeName[value] = key;
});

// CIP Vol1 Table 4-4.2
const ReservedClassAttributes = {
  Revision: 1,
  MaxInstance: 2,
  NumberOfInstances: 3,
  OptionalAttributeList: 4,
  OptionalServiceList: 5,
  MaximumIDNumberClassAttributes: 6,
  MaximumIDNumberInstanceAttributes: 7
};


module.exports = {
  Classes,
  ClassNames,
  Services,
  DataType,
  DataTypeName,
  ReservedClassAttributes,
  DecodeValue,
  EncodeValue
};


function DecodeValue(dataType, buffer, offset, cb) {
  let error;
  let value;

  try {
    switch (dataType) {
      case DataType.SINT:
        value = buffer.readInt8(offset); offset += 1;
        break;
      case DataType.INT:
      case DataType.ITIME:
        value = buffer.readInt16LE(offset); offset += 2;
        break;
      case DataType.DINT:
      case DataType.TIME:
      case DataType.FTIME:
        value = buffer.readInt32LE(offset); offset += 4;
        break;
      case DataType.REAL:
        value = buffer.readFloatLE(offset); offset += 4;
        break;
      case DataType.BOOL:
        value = buffer.readUInt8(offset) > 0; offset += 1;
        break;
      case DataType.USINT:
      case DataType.BYTE:
        value = buffer.readUInt8(offset); offset += 1;
        break;
      case DataType.UINT:
      case DataType.WORD:
        value = buffer.readUInt16LE(offset); offset += 2;
        break;
      case DataType.UDINT:
      case DataType.DWORD:
      case DataType.DATE:
        value = buffer.readUInt32LE(offset); offset += 4;
        break;
      case DataType.STRING: {
        const length = buffer.readUInt16LE(offset); offset += 2;
        value = buffer.toString('ascii', offset, offset + length); offset += length;
        break;
      }
      case DataType.SHORT_STRING: {
        const length = buffer.readUInt8(offset); offset += 1;
        value = buffer.toString('ascii', offset, offset + length); offset += length;
        break;
      }
      case DataType.STRING2: {
        const length = buffer.readUInt16LE(offset); offset += 2;
        value = buffer.toString('utf16le', offset, offset + 2 * length); offset += 2 * length;
        break;
      }
      case DataType.LINT:
      case DataType.ULINT:
      case DataType.LREAL:
      case DataType.LWORD:
      case DataType.LTIME:
      default:
        error = `Data type is not currently supported: ${DataTypeName[dataType] || dataType}`
        break;
    }
  } catch(err) {
    error = err.message;
  }
  
  if (typeof cb === 'function') {
    cb(error, value);
  }

  return offset;
}


function EncodeValue(dataType, value) {
  let data;

  switch (dataType) {
    case DataType.SINT:
      data = Buffer.alloc(1);
      data.writeInt8(value, 0);
      break;
    case DataType.INT:
    case DataType.ITIME:
      data = Buffer.alloc(2);
      data.writeInt16LE(value, 0);
      break;
    case DataType.DINT:
    case DataType.TIME:
    case DataType.FTIME:
      data = Buffer.alloc(4);
      data.writeInt32LE(value, 0);
      break;
    case DataType.REAL:
      data = Buffer.alloc(4);
      data.writeFloatLE(value, 0);
      break;
    case DataType.UINT:
    case DataType.WORD:
      data = Buffer.alloc(2);
      data.writeUInt16LE(value, 0);
      break;
    case DataType.UDINT:
    case DataType.DWORD:
    case DataType.DATE:
      data = Buffer.alloc(4);
      data.writeUInt32LE(value, 0);
      break;
    default:
      break;
  }

  return data;
}