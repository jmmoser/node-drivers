'use strict';

const { InvertKeyValues } = require('../../../utils');

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

const ClassNames = InvertKeyValues(Classes);


// CIP Vol1 Appendix A
const CommonServices = {
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

const CommonServiceNames = InvertKeyValues(CommonServices);


// CIP Vol1 Table C-6.1
const DataTypes = {
  STRUCT: -1,

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

const DataTypeNames = InvertKeyValues(DataTypes);


// CIP Vol1 Edition 3.3 Table 4-4.2
const ReservedClassAttributes = {
  Revision: 1,
  MaxInstance: 2,
  NumberOfInstances: 3,
  OptionalAttributeList: 4,
  OptionalServiceList: 5,
  MaximumIDNumberClassAttributes: 6,
  MaximumIDNumberInstanceAttributes: 7
};


// const ReservedClassAttributes = {
//   Revision: {
//     Code: 0x01,
//     DataType: {
//       Code: DataTypes.UINT
//     }
//   },
//   MaxInstance: {
//     Code: 0x02,
//     DataType: {
//       Code: DataTypes.UINT
//     }
//   },
//   NumberOfInstances: {
//     Code: 0x03,
//     DataType: {
//       Code: DataTypes.UINT
//     }
//   },
//   OptionalAttributeList: {
//     Code: 0x04,
//     DataType: {
//       Code: DataTypes.STRUCT,
//       Structure: [
//         {
//           name: 'NumberOfAttributes',
//           dataType: 'UINT'
//         },
//         {
//           name: 'AttributeNumbers',
//           dataType: 'UINT[]'
//         }
//       ],
//       Decode: function(buffer, offset, callback) {
//         let error;
//         let numberOfAttributes;
//         offset = DecodeValue(DataTypes.UINT, buffer, offset, (err, value) => {
//           error = err;
//           numberOfAttributes = value;
//         });

//         if (error) {
//           return callback(error);
//         }

//         const attributes = [];

//         for (let i = 0; i < numberOfAttributes; i++) {
//           let attribute;
//           offset = DecodeValue(DataTypes.UINT, buffer, offset, (err, value) => {
//             error = err;
//             attribute = value;
//           });

//           if (error) {
//             return callback(error);
//           }

//           attributes.push(attribute);
//         }

//         callback(null, attributes);
//         return offset;
//       }
//       /**
//        * STRUCT of
//        * - (UINT) number of attributes (in the optional attribute list)
//        * - (ARRAY of UINT) list of optional attribute numbers
//        */
//     }
//   }
// };



// CIP-V1-1.0 Appendix B-1. General status codes
const GeneralStatusCodeNames = {
  0x00: 'Success',
  0x01: 'Connection failure',
  0x02: 'Resource unavailable',
  0x03: 'Invalid parameter value',
  0x04: 'Path segment error',
  0x05: 'Path destination unknown',
  0x06: 'Partial transfer',
  0x07: 'Connection lost',
  0x08: 'Service not supported',
  0x09: 'Invalid attribute value',
  0x0A: 'Attribute list error',
  0x0B: 'Already in requested mode/state',
  0x0C: 'Object state conflict',
  0x0D: 'Object already exists',
  0x0E: 'Attribute not settable',
  0x0F: 'Privilege violation',
  0x10: 'Device state conflict',
  0x11: 'Reply data too large',
  0x12: 'Fragmentation of a primitive value',
  0x13: 'Not enough data',
  0x14: 'Attribute not supported',
  0x15: 'Too much data',
  0x16: 'Objet does not exist',
  0x17: 'Service fragmentation sequence not in progress',
  0x18: 'No stored attribute data',
  0x19: 'Store operation failure',
  0x1A: 'Routing failure, request packet too large',
  0x1B: 'Routing failure, response packet too large',
  0x1C: 'Missing attribute list entry data',
  0x1D: 'Invalid attribute value list',
  0x1E: 'Embedded service error',
  0x1F: 'Vendor specific error',
  0x20: 'Invalid parameter',
  0x21: 'Write-once value or medium already written',
  0x22: 'Invalid Replay Received',
  0x25: 'Key Failure in path',
  0x26: 'Path Size Invalid',
  0x27: 'Unexpected attribute in list',
  0x28: 'Invalid member ID',
  0x29: 'Member not settable',
  0x2A: 'Group 2 only server general failure'
};

// CIP-V1-1.0 Appendix B-1. General status codes
const GeneralStatusCodeDescriptions = {
  0x01: 'A connection related service failed along the connection path.',
  0x02: 'Resources needed for the object to perform the requested service were unavailable.',
  0x03: 'See Status Code 0x20, which is the preferred value to use for this condition.',
  0x04: 'The path segment identifier or the segment syntax was not understood by the processing node. Path processing shall stop when a path segment error is encountered.',
  0x05: 'The path is referencing an object class, instance or structure element that is not known or is not contained in the processing node. Path processing shall stop when a path destination unknown error is encountered.',
  0x06: 'Only part of the expected data was transferred.',
  0x07: 'The message connection was lost.',
  0x08: 'The requested service was not implemented or was not defined for this Object Class/Instance.',
  0x09: 'Invalid attribute data detected.',
  0x0A: 'An attribute in the Get_Attribute_List or Set_Attribute_List response has a non-zero status.',
  0x0B: 'The object is already in the mode/state being requested by the service.',
  0x0C: 'The object cannot perform the requested service in its current mode/state.',
  0x0D: 'The requested instance of object to be created already exists.',
  0x0E: 'A request to modify a non-modifiable attribute was received.',
  0x0F: 'A permission/privilege check failed.',
  0x10: 'The device’s current mode/state prohibits the execution of the requested service.',
  0x11: 'The data to be transmitted in the response buffer is larger than the allocated response buffer.',
  0x12: 'The service specified an operation that is going to fragment a primitive data value, i.e. half a REAL data type.',
  0x13: 'The service did not supply enough data to perform the specified operation.',
  0x14: 'The attribute specified in the request is not supported.',
  0x15: 'The service supplied more data than was expected.',
  0x16: 'The object specified does not exist in the device.',
  0x17: 'The fragmentation sequence for this service is not currently active for this data.',
  0x18: 'The attribute data of this object was not saved prior to the requested service.',
  0x19: 'The attribute data of this object was not saved due to a failure during the attempt.',
  0x1A: 'The service request packet was too large for transmission on a network in the path to the destination. The routing device was forced to abort the service.',
  0x1B: 'The service response packet was too large for transmission on a network in the path from the destination. The routing device was forced to abort the service.',
  0x1C: 'The service did not supply an attribute in a list of attributes that was needed by the service to perform the requested behaviour.',
  0x1D: 'The service is returning the list of attributes supplied with status information for those attributes that were invalid.',
  0x1E: 'An embedded service resulted in an error.',
  0x1F: 'A vendor specific error has been encountered. The Additional Code Field of the Error Response defines the particular error encountered. Use of this General Error Code should only be performed when none of the Error Codes presented in this table or within an Object Class definition accurately reflect the error.',
  0x20: 'A parameter associated with the request was invalid. This code is used when a parameter does not meet the requirements of this specification and/or the requirements defined in an Application Object Specification.',
  0x21: 'An attempt was made to write to a write-once medium (e.g. WORM drive, PROM) that has already been written, or to modify a value that cannot be changed once established.',
  0x22: 'An invalid reply is received (e.g. reply service code does not match the request service code, or reply message is shorter than the minimum expected reply size). This status code can serve for other causes of invalid replies.',
  0x25: 'The Key Segment that was included as the first segment in the path does not match the destination module. The object specific status shall indicate which part of the key check failed.',
  0x26: 'The size of the path which was sent with the Service Request is either not large enough to allow the Request to be routed to an object or too much routing data was included.',
  0x27: 'An attempt was made to set an attribute that is not able to be set at this time.',
  0x28: 'The Member ID specified in the request does not exist in the specified Class/Instance/Attribute.',
  0x29: 'A request to modify a non-modifiable member was received.',
  0x2A: 'This error code may only be reported by DeviceNet group 2 only servers with 4K or less code space and only in place of Service not supported, Attribute not supported and Attribute not settable.'
};



function DecodeValue(dataType, buffer, offset, cb) {
  let error;
  let value;

  try {
    switch (dataType) {
      case DataTypes.SINT:
        value = buffer.readInt8(offset); offset += 1;
        break;
      case DataTypes.INT:
      case DataTypes.ITIME:
        value = buffer.readInt16LE(offset); offset += 2;
        break;
      case DataTypes.DINT:
      case DataTypes.TIME:
      case DataTypes.FTIME:
        value = buffer.readInt32LE(offset); offset += 4;
        break;
      case DataTypes.REAL:
        value = buffer.readFloatLE(offset); offset += 4;
        break;
      case DataTypes.BOOL:
        value = buffer.readUInt8(offset) > 0; offset += 1;
        break;
      case DataTypes.USINT:
      case DataTypes.BYTE:
        value = buffer.readUInt8(offset); offset += 1;
        break;
      case DataTypes.UINT:
      case DataTypes.WORD:
        value = buffer.readUInt16LE(offset); offset += 2;
        break;
      case DataTypes.UDINT:
      case DataTypes.DWORD:
      case DataTypes.DATE:
        value = buffer.readUInt32LE(offset); offset += 4;
        break;
      case DataTypes.STRING: {
        const length = buffer.readUInt16LE(offset); offset += 2;
        value = buffer.toString('ascii', offset, offset + length); offset += length;
        break;
      }
      case DataTypes.SHORT_STRING: {
        const length = buffer.readUInt8(offset); offset += 1;
        value = buffer.toString('ascii', offset, offset + length); offset += length;
        break;
      }
      case DataTypes.STRING2: {
        const length = buffer.readUInt16LE(offset); offset += 2;
        value = buffer.toString('utf16le', offset, offset + 2 * length); offset += 2 * length;
        break;
      }
      case DataTypes.LINT:
      case DataTypes.ULINT:
      case DataTypes.LREAL:
      case DataTypes.LWORD:
      case DataTypes.LTIME:
      default:
        error = `Data type is not currently supported: ${DataTypeNames[dataType] || dataType}`
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
    case DataTypes.SINT:
      data = Buffer.alloc(1);
      data.writeInt8(value, 0);
      break;
    case DataTypes.INT:
    case DataTypes.ITIME:
      data = Buffer.alloc(2);
      data.writeInt16LE(value, 0);
      break;
    case DataTypes.DINT:
    case DataTypes.TIME:
    case DataTypes.FTIME:
      data = Buffer.alloc(4);
      data.writeInt32LE(value, 0);
      break;
    case DataTypes.REAL:
      data = Buffer.alloc(4);
      data.writeFloatLE(value, 0);
      break;
    case DataTypes.UINT:
    case DataTypes.WORD:
      data = Buffer.alloc(2);
      data.writeUInt16LE(value, 0);
      break;
    case DataTypes.UDINT:
    case DataTypes.DWORD:
    case DataTypes.DATE:
      data = Buffer.alloc(4);
      data.writeUInt32LE(value, 0);
      break;
    default:
      break;
  }

  return data;
}




module.exports = {
  Classes,
  ClassNames,
  CommonServices,
  CommonServiceNames,
  DataTypes,
  DataTypeNames,
  ReservedClassAttributes,
  GeneralStatusCodeNames,
  GeneralStatusCodeDescriptions,
  DecodeValue,
  EncodeValue
};