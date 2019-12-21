'use strict';

const {
  getBit,
  decodeUnsignedInteger,
  InvertKeyValues
} = require('../../../utils');

const EPath = require('./EPath');

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
  MultipleServicePacket: 0x0A, /** CIP Vol 1, A-4.10.2 */
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
const DataTypeCodes = {
  /** DATATYPES FROM EXTERNAL SOURCES CANNOT BE NEGATIVE BECAUSE CODE IS READ AS UNSIGNED */
  TRANSFORM: -4,
  PLACEHOLDER: -3, /** used when previously decoded data determines datatype */
  SMEMBER: -2,
  UNKNOWN: -1, 

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
  STRINGI: 0xDE,

  /** CIP Volume 1, C-6.2 Constructed Data Type Reporting */
  ABBREV_STRUCT: 0xA0, /* Data is an abbreviated struct type, i.e. a CRC of the actual type descriptor */
  ABBREV_ARRAY: 0xA1, /* Data is an abbreviated array type. The limits are left off */
  STRUCT: 0xA2, /* Data is a struct type descriptor */
  ARRAY: 0xA3 /* Data is an array type descriptor */
};

const DataTypeNames = InvertKeyValues(DataTypeCodes);


const DataType = {
  UNKNOWN(length) {
    return { type: DataType.UNKNOWN, code: DataTypeCodes.UNKNOWN, length };
  },

  /** Elementary Types */
  BOOL(position) {
    return { type: DataType.BOOL, code: DataTypeCodes.BOOL, position };
  },
  SINT() {
    return { type: DataType.SINT, code: DataTypeCodes.SINT };
  },
  INT() {
    return { type: DataType.INT, code: DataTypeCodes.INT };
  },
  DINT() {
    return { type: DataType.DINT, code: DataTypeCodes.DINT };
  },
  LINT() {
    return { type: DataType.LINT, code: DataTypeCodes.LINT };
  },
  USINT() {
    return { type: DataType.USINT, code: DataTypeCodes.USINT };
  },
  UINT() {
    return { type: DataType.UINT, code: DataTypeCodes.UINT };
  },
  UDINT() {
    return { type: DataType.UDINT, code: DataTypeCodes.UDINT };
  },
  ULINT() {
    return { type: DataType.ULINT, code: DataTypeCodes.ULINT };
  },
  REAL() {
    return { type: DataType.REAL, code: DataTypeCodes.REAL };
  },
  LREAL() {
    return { type: DataType.LREAL, code: DataTypeCodes.LREAL };
  },
  STIME() {
    return { type: DataType.STIME, code: DataTypeCodes.STIME };
  },
  DATE() {
    return { type: DataType.DATE, code: DataTypeCodes.DATE };
  },
  TIME_OF_DAY() {
    return { type: DataType.TIME_OF_DAY, code: DataTypeCodes.TIME_OF_DAY };
  },
  DATE_AND_TIME() {
    return { type: DataType.DATE_AND_TIME, code: DataTypeCodes.DATE_AND_TIME };
  },
  STRING() {
    return { type: DataType.STRING, code: DataTypeCodes.STRING };
  },
  BYTE() {
    return { type: DataType.BYTE, code: DataTypeCodes.BYTE };
  },
  WORD() {
    return { type: DataType.WORD, code: DataTypeCodes.WORD };
  },
  DWORD() {
    return { type: DataType.DWORD, code: DataTypeCodes.DWORD };
  },
  LWORD() {
    return { type: DataType.LWORD, code: DataTypeCodes.LWORD };
  },
  STRING2() {
    return { type: DataType.STRING2, code: DataTypeCodes.STRING2 };
  },
  FTIME() {
    return { type: DataType.FTIME, code: DataTypeCodes.FTIME };
  },
  LTIME() {
    return { type: DataType.LTIME, code: DataTypeCodes.LTIME };
  },
  ITIME() {
    return { type: DataType.ITIME, code: DataTypeCodes.ITIME };
  },
  STRINGN() {
    return { type: DataType.STRINGN, code: DataTypeCodes.STRINGN };
  },
  SHORT_STRING() {
    return { type: DataType.SHORT_STRING, code: DataTypeCodes.SHORT_STRING };
  },
  TIME() {
    return { type: DataType.TIME, code: DataTypeCodes.TIME };
  },
  // EPATH(padded) {
  //   return function(length) {
  //     return { type: DataType.EPATH, code: DataTypeCodes.EPATH, padded, length };
  //   }
  // },
  EPATH(padded, length) {
    return { type: DataType.EPATH, code: DataTypeCodes.EPATH, padded, length };
  },
  ENGUNIT() {
    return { type: DataType.ENGUNIT, code: DataTypeCodes.ENGUNIT };
  },
  STRINGI() {
    /** See CIP Vol 1, Appendix C-4.1 for abstract syntax notation */
    return {
      type: DataType.STRINGI,
      code: DataTypeCodes.STRINGI,
      itype: DataType.STRUCT([
        DataType.USINT, // Number of internationalized character strings
        DataType.PLACEHOLDER((length) => DataType.ARRAY(
          DataType.STRUCT([
            DataType.TRANSFORM(
              DataType.ARRAY(DataType.USINT, 0, 2), // First three characters of the ISO 639-2/T language
              val => Buffer.from(val).toString('ascii')
            ),
            DataType.EPATH(false), // Structure of the character string (0xD0, 0xD5, 0xD9, or 0xDA)
            DataType.UINT, // Character set which the character string is based on,
            DataType.PLACEHOLDER(code => { // Actual International character string
              switch (code) {
                case DataTypeCodes.STRING:
                  return DataType.STRING;
                case DataTypeCodes.STRING2:
                  return DataType.STRING2;
                case DataTypeCodes.STRINGN:
                  return DataType.STRINGN;
                case DataTypeCodes.SHORT_STRING:
                  return DataType.SHORT_STRING;
                default:
                  throw new Error(`Invalid internationalized string data type ${code}`);
              }
            })
          ], function (members, dt) {
            if (members.length === 3) {
              return dt.resolve(members[1].value.code);
            }
          }), 0, length - 1)
        ),
      ], function decodeCallback(members, dt) {
        if (members.length === 1) {
          return dt.resolve(members[0]); // provides the length for the array
        }
      })
    };
  },

  /** CIP Volume 1, C-6.2 Constructed Data Type Reporting */
  ABBREV_STRUCT(crc) {
    return {
      type: DataType.ABBREV_STRUCT,
      code: DataTypeCodes.ABBREV_STRUCT,
      constructed: true,
      abbreviated: true,
      crc
    };
  },
  ABBREV_ARRAY(itemType) {
    return {
      type: DataType.ABBREV_ARRAY,
      code: DataTypeCodes.ABBREV_ARRAY,
      constructed: true,
      abbreviated: true,
      itemType
    };
  },
  /**
   * decodeCallback(decodedMembers, memberDataType, structDataType)
   *  - is called before each member is decoded */
  STRUCT(members, decodeCallback) {
    return {
      type: DataType.STRUCT,
      code: DataTypeCodes.STRUCT,
      constructed: true,
      abbreviated: false,
      members,
      decodeCallback
    };
  },
  ARRAY(itemType, lowerBound, upperBound, boundTags) {
    return {
      type: DataType.ARRAY,
      code: DataTypeCodes.ARRAY,
      constructed: true,
      abbreviated: false,
      itemType,
      lowerBound,
      upperBound,
      boundTags
    };
  },

  SMEMBER(member, filter) {
    return { type: DataType.SMEMBER, code: DataTypeCodes.SMEMBER, member, filter }
  },
  PLACEHOLDER(resolve) {
    return {
      type: DataType.PLACEHOLDER,
      code: DataTypeCodes.PLACEHOLDER,
      resolve
    }
  },
  TRANSFORM(dataType, transform) {
    return { type: DataType.TRANSFORM, code: DataTypeCodes.TRANSFORM, dataType, transform };
  }
};


function __DecodeDataType(buffer, offset, cb) {
  let type;
  const code = buffer.readUInt8(offset); offset += 1;
  switch (code) {
    case DataTypeCodes.ABBREV_STRUCT: {
      const length = buffer.readUInt8(offset); offset += 1;
      const crc = decodeUnsignedInteger(buffer, offset, length);
      offset += length;
      type = DataType.ABBREV_STRUCT(crc);
      break;
    }
    case DataTypeCodes.ABBREV_ARRAY: {
      /* const length = buffer.readUInt8(offset); */ offset += 1;
      let itemType;
      offset = __DecodeDataType(buffer, offset, items => itemType = items);
      type = Datatype.ABBREV_ARRAY(itemType);
      break;
    }
    case DataTypeCodes.STRUCT: {
      const length = buffer.readUInt8(offset); offset += 1;
      const members = [];
      const lastOffset = offset + length;
      while (offset < lastOffset) {
        offset = __DecodeDataType(buffer, offset, function (member) {
          members.push(member);
        });
      }
      type = DataType.STRUCT(members);
      break;
    }
    case DataTypeCodes.ARRAY: {
      /* const length = buffer.readUInt8(offset); */ offset += 1;

      const lowerBoundTag = buffer.readUInt8(offset); offset += 1;
      const lowerBoundLength = buffer.readUInt8(offset); offset += 1;
      const lowerBound = decodeUnsignedInteger(buffer, offset, lowerBoundLength);
      offset += lowerBoundLength;

      const upperBoundTag = buffer.readUInt8(offset); offset += 1;
      const upperBoundLength = buffer.readUInt8(offset); offset += 1;
      const upperBound = decodeUnsignedInteger(buffer, offset, upperBoundLength);
      offset += upperBoundLength;

      const boundTags = [lowerBoundTag, upperBoundTag];

      let itemType;
      offset = __DecodeDataType(buffer, offset, items => itemType = items);
      type = DataType.ARRAY(itemType, lowerBound, upperBound, boundTags);
      break;
    }
    default:
      type = DataType[DataTypeNames[code]]();
      break;
  }

  if (typeof cb === 'function') {
    cb(type);
  }

  return offset;
}


function DecodeDataType(buffer, offset, cb) {
  const nextOffset = __DecodeDataType(buffer, offset, cb);
  if (nextOffset - offset === 1) {
    /**
     * If data type is elementary then __DecodeDataType will only
     * read 1 byte but data type encoding is 2 bytes
     */
    return offset + 2;
  }
  return nextOffset;
}


function Decode(dataType, buffer, offset, cb, ctx) {
  let value;

  if (dataType instanceof Function) dataType = dataType();

  if (ctx && ctx.dataTypeCallback) {
    /** Used to modify the datatype, especially with placeholders */
    dataType = ctx.dataTypeCallback(dataType) || dataType;

    /** dataTypeCallback may return a type function */
    if (dataType instanceof Function) dataType = dataType(); 
  }

  let dataTypeCode = dataType;

  if (typeof dataType === 'object') {
    dataTypeCode = dataType.code;

    if (dataType.itype) {
      return Decode(dataType.itype, buffer, offset, cb, ctx);
    }
  }

  switch (dataTypeCode) {
    case DataTypeCodes.SINT:
      value = buffer.readInt8(offset); offset += 1;
      break;
    case DataTypeCodes.USINT:
    case DataTypeCodes.BYTE:
      value = buffer.readUInt8(offset); offset += 1;
      break;
    case DataTypeCodes.INT:
    case DataTypeCodes.ITIME:
      value = buffer.readInt16LE(offset); offset += 2;
      break;
    case DataTypeCodes.UINT:
    case DataTypeCodes.WORD:
      value = buffer.readUInt16LE(offset); offset += 2;
      break;
    case DataTypeCodes.DINT:
    case DataTypeCodes.TIME:
    case DataTypeCodes.FTIME:
      value = buffer.readInt32LE(offset); offset += 4;
      break;
    case DataTypeCodes.REAL:
      value = buffer.readFloatLE(offset); offset += 4;
      break;
    case DataTypeCodes.BOOL:
      value = buffer.readUInt8(offset); offset += 1;
      if (dataType.info != null) {
        if (dataType.info > 7) {
          throw new Error(`Bit position too high: ${dataType.info}`);
        }
        value = getBit(value, dataType.info);
      }
      value = value > 0;
      break;
    case DataTypeCodes.UDINT:
    case DataTypeCodes.DWORD:
    case DataTypeCodes.DATE:
      value = buffer.readUInt32LE(offset); offset += 4;
      break;
    case DataTypeCodes.STRING: {
      const length = buffer.readUInt16LE(offset); offset += 2;
      value = buffer.toString('ascii', offset, offset + length); offset += length;
      break;
    }
    case DataTypeCodes.SHORT_STRING: {
      const length = buffer.readUInt8(offset); offset += 1;
      value = buffer.toString('ascii', offset, offset + length); offset += length;
      break;
    }
    case DataTypeCodes.STRING2: {
      const length = buffer.readUInt16LE(offset); offset += 2;
      value = buffer.toString('utf16le', offset, offset + 2 * length); offset += 2 * length;
      break;
    }
    case DataTypeCodes.STRINGN: {
      const width = buffer.readUInt16LE(offset); offset += 2;
      const length = buffer.readUInt16LE(offset); offset += 2;
      const total = width * length;
      value = buffer.toString('utf16le', offset, offset + total); offset += total;
      break;
    }
    case DataTypeCodes.LTIME:
    case DataTypeCodes.LINT:
      value = buffer.readBigInt64LE(offset); offset += 8;
      break;
    case DataTypeCodes.LWORD:
    case DataTypeCodes.ULINT:
      value = buffer.readBigUInt64LE(offset); offset += 8;
      break;
    case DataTypeCodes.LREAL:
      value = buffer.readDoubleLE(offset); offset += 8;
      break;
    case DataTypeCodes.SMEMBER:
      offset = Decode(dataType.member, buffer, offset, val => value = val);
      break;
    case DataTypeCodes.STRUCT: {
      /** Name of members is not known so use array to hold decoded member values */
      value = [];

      const ctx = {};
      if (typeof dataType.decodeCallback === 'function') {
        ctx.dataTypeCallback = function (dt) {
          return dataType.decodeCallback(value, dt, dataType);
        };
      }

      dataType.members.forEach(member => {
        offset = Decode(member, buffer, offset, function (memberValue) {
          value.push(memberValue);
        }, ctx);
      });

      value = value.filter((val, idx) => {
        return !(dataType.members[idx].code === DataTypeCodes.SMEMBER && dataType.members[idx].filter === true);
      });
      
      break;
    }
    case DataTypeCodes.ARRAY: {
      value = [];
      for (let i = dataType.lowerBound; i <= dataType.upperBound; i++) {
        offset = Decode(dataType.itemType, buffer, offset, function(item) {
          value.push(item)
        });
      }
      break;
    }
    case DataTypeCodes.EPATH:
      offset = EPath.Decode(buffer, offset, dataType.length, dataType.padded, val => value = val);
      break;
    case DataTypeCodes.UNKNOWN: {
      value = buffer.slice(offset, offset + dataType.length);
      offset += dataType.length;
      break;
    }
    case DataTypeCodes.TRANSFORM: {
      offset = Decode(dataType.dataType, buffer, offset, val => value = dataType.transform(val));
      break;
    }
    case DataTypeCodes.PLACEHOLDER:
      throw new Error(`Placeholder datatype should have been replaced before decoding`);
    default:
      throw new Error(`Decoding for data type is not currently supported: ${DataTypeNames[dataTypeCode] || dataTypeCode}`);
  }

  if (cb instanceof Function) {
    cb(value);
  }

  return offset;
}


function Encode(dataType, value) {
  const buffer = Buffer.alloc(EncodeSize(dataType, value));
  EncodeTo(buffer, 0, dataType, value);
  return buffer;
}


// function Encode(dataType, value) {
//   if (dataType instanceof Function) dataType = dataType();

//   let data;

//   const dataTypeCode = dataType.code != null ? dataType.code : dataType;

//   switch (dataTypeCode) {
//     case DataTypeCodes.SINT:
//       data = Buffer.allocUnsafe(1);
//       data.writeInt8(value, 0);
//       break;
//     case DataTypeCodes.USINT:
//     case DataTypeCodes.BYTE:
//       data = Buffer.allocUnsafe(1);
//       data.writeUInt8(value, 0);
//       break;
//     case DataTypeCodes.INT:
//     case DataTypeCodes.ITIME:
//       data = Buffer.allocUnsafe(2);
//       data.writeInt16LE(value, 0);
//       break;
//     case DataTypeCodes.DINT:
//     case DataTypeCodes.TIME:
//     case DataTypeCodes.FTIME:
//       data = Buffer.allocUnsafe(4);
//       data.writeInt32LE(value, 0);
//       break;
//     case DataTypeCodes.REAL:
//       data = Buffer.allocUnsafe(4);
//       data.writeFloatLE(value, 0);
//       break;
//     case DataTypeCodes.UINT:
//     case DataTypeCodes.WORD:
//       data = Buffer.allocUnsafe(2);
//       data.writeUInt16LE(value, 0);
//       break;
//     case DataTypeCodes.UDINT:
//     case DataTypeCodes.DWORD:
//     case DataTypeCodes.DATE:
//       data = Buffer.allocUnsafe(4);
//       data.writeUInt32LE(value, 0);
//       break;
//     case DataTypeCodes.STRING: {
//       const stringBuffer = Buffer.from(value, 'ascii');
//       data = Buffer.allocUnsafe(2 + stringBuffer.length);
//       data.writeUInt16LE(stringBuffer.length, 0);
//       stringBuffer.copy(data, 2);
//       break;
//     }
//     case DataTypeCodes.SHORT_STRING: {
//       const stringBuffer = Buffer.from(value, 'ascii');
//       data = Buffer.allocUnsafe(1 + stringBuffer.length);
//       data.writeUInt8(stringBuffer.length, 0);
//       stringBuffer.copy(data, 1);
//       break;
//     }
//     case DataTypeCodes.STRING2: {
//       const stringBuffer = Buffer.from(value, 'utf16le');
//       data = Buffer.allocUnsafe(2 + stringBuffer.length);
//       data.writeUInt16LE(stringBuffer.length, 0);
//       stringBuffer.copy(data, 2);
//       break;
//     }
//     case DataTypeCodes.LTIME:
//     case DataTypeCodes.LINT:
//       data = Buffer.allocUnsafe(8);
//       data.writeBigInt64LE(value, 0);
//       break;
//     case DataTypeCodes.LWORD:
//     case DataTypeCodes.ULINT:
//       data = Buffer.allocUnsafe(8);
//       data.writeBigUInt64LE(value, 0);
//       break;
//     case DataTypeCodes.LREAL:
//       data = Buffer.allocUnsafe(8);
//       data.writeDoubleLE(value, 0);
//       break;
//     default:
//       throw new Error(`Encoding for data type is not currently supported: ${DataTypeNames[dataTypeCode] || dataTypeCode}`);
//   }

//   return data;
// }


function EncodeSize(dataType, value) {
  if (dataType instanceof Function) dataType = dataType();

  const dataTypeCode = dataType.code != null ? dataType.code : dataType;

  switch (dataTypeCode) {
    case DataTypeCodes.SINT:
    case DataTypeCodes.USINT:
    case DataTypeCodes.BYTE:
      return 1;
    case DataTypeCodes.INT:
    case DataTypeCodes.ITIME:
    case DataTypeCodes.UINT:
    case DataTypeCodes.WORD:
      return 2;
    case DataTypeCodes.DINT:
    case DataTypeCodes.TIME:
    case DataTypeCodes.FTIME:
    case DataTypeCodes.REAL:
    case DataTypeCodes.UDINT:
    case DataTypeCodes.DWORD:
    case DataTypeCodes.DATE:
      return 4;
    case DataTypeCodes.STRING:
      return 2 + Buffer.from(value, 'ascii').length;
    case DataTypeCodes.SHORT_STRING:
      return 1 + Buffer.from(value, 'ascii').length;
    case DataTypeCodes.STRING2:
      return 2 + Buffer.from(value, 'utf16le').length;
    case DataTypeCodes.LTIME:
    case DataTypeCodes.LINT:
    case DataTypeCodes.LWORD:
    case DataTypeCodes.ULINT:
    case DataTypeCodes.LREAL:
      return 8;
    case DataTypeCodes.EPATH:
      return EPath.EncodeSize(dataType.padded, value);
    case DataTypeCodes.ARRAY:
    case DataTypeCodes.ABBREV_ARRAY:
      if (!Array.isArray(value)) {
        throw new Error(`Value must be an array to determine encoding size. Received ${typeof value}`);
      }
      if (value.length === 0) {
        return 0;
      }
      return value.length * EncodeSize(dataType.itemType, value[0]);
    default:
      throw new Error(`Encoding size for data type is not currently supported: ${DataTypeNames[dataTypeCode] || dataTypeCode}`);
  }
}


function EncodeTo(buffer, offset, dataType, value) {
  if (dataType instanceof Function) dataType = dataType();

  const dataTypeCode = dataType.code != null ? dataType.code : dataType;

  switch (dataTypeCode) {
    case DataTypeCodes.SINT:
      offset = buffer.writeInt8(value, offset);
      break;
    case DataTypeCodes.USINT:
    case DataTypeCodes.BYTE:
      offset = buffer.writeUInt8(value, offset);
      break;
    case DataTypeCodes.INT:
    case DataTypeCodes.ITIME:
      offset = buffer.writeInt16LE(value, offset);
      break;
    case DataTypeCodes.UINT:
    case DataTypeCodes.WORD:
      offset = buffer.writeUInt16LE(value, offset);
      break;
    case DataTypeCodes.DINT:
    case DataTypeCodes.TIME:
    case DataTypeCodes.FTIME:
      offset = buffer.writeInt32LE(value, offset);
      break;
    case DataTypeCodes.UDINT:
    case DataTypeCodes.DWORD:
    case DataTypeCodes.DATE:
      offset = buffer.writeUInt32LE(value, offset);
      break;
    case DataTypeCodes.REAL:
      offset = buffer.writeFloatLE(value, offset);
      break;
    case DataTypeCodes.STRING: {
      const stringBuffer = Buffer.from(value, 'ascii');
      offset = buffer.writeUInt16LE(stringBuffer.length, offset);
      offset += stringBuffer.copy(buffer, offset);
      break;
    }
    case DataTypeCodes.SHORT_STRING: {
      const stringBuffer = Buffer.from(value, 'ascii');
      offset = buffer.writeUInt8(stringBuffer.length, offset);
      offset += stringBuffer.copy(buffer, offset);
      break;
    }
    case DataTypeCodes.STRING2: {
      const stringBuffer = Buffer.from(value, 'utf16le');
      /** Use [...value].length instead of value.length??? */
      offset = buffer.writeUInt16LE(value.length, offset);
      offset += stringBuffer.copy(buffer, offset);
      break;
    }
    case DataTypeCodes.LINT:
    case DataTypeCodes.LTIME:
      offset = buffer.writeBigInt64LE(BigInt(value), offset);
      break;
    case DataTypeCodes.LWORD:
    case DataTypeCodes.ULINT:
      offset = buffer.writeBigUInt64LE(BigInt(value), offset);
      break;
    case DataTypeCodes.LREAL:
      offset = buffer.writeDoubleLE(value, offset);
      break;
    case DataTypeCodes.EPATH:
      offset = EPath.EncodeSegmentsTo(buffer, offset, dataType.padded, value);
      break;
    case DataTypeCodes.ARRAY:
    case DataTypeCodes.ABBREV_ARRAY: {
      if (!Array.isArray(value)) {
        throw new Error(`Value must be an array to encode an array. Received: ${typeof value}`);
      }
      for (let i = 0; i < value.length; i++) {
        offset = EncodeTo(buffer, offset, dataType.itemType, value[i]);
      }
      break;
    }
    case DataTypeCodes.BOOL:
      throw new Error(`Boolean encoding isn't currently supported, use BYTE instead`);
    default:
      throw new Error(`Encoding for data type is not currently supported: ${DataTypeNames[dataTypeCode] || dataTypeCode}`);
  }

  return offset;
}





const NeedCodes = Object.freeze({
  Optional: 0b1,
  Conditional: 0b10
});

const AccessCodes = Object.freeze({
  Get: 0b1,
  Set: 0b10
});


class Attribute {
  constructor(id, need, access, name, dataType) {
    this.id = id;
    this.need = need;
    this.access = access;
    this.name = name;
    this.dataType = dataType;
  }
}

// function Attribute(id, need, access, name, dataType) {
//   return {
//     id,
//     needType,
//     accessRule,
//     name,
//     dataType
//   };
// }

/** CIP Vol 1, Table 4-4.2 */
const ReservedClassAttributes = Object.freeze({
  Revision: new Attribute(1, NeedCodes.Conditional, AccessCodes.Get, 'Revision', DataType.UINT),
  MaxInstance: new Attribute(2, NeedCodes.Optional, AccessCodes.Get, 'Max Instance', DataType.UINT),
  NumberOfInstances: new Attribute(3, NeedCodes.Optional, AccessCodes.Get, 'Number of Instances', DataType.UINT),
  OptionalAttributeList: new Attribute(
    4,
    NeedCodes.Optional,
    AccessCodes.Get,
    'Optional Attribute List',
    DataType.STRUCT([
      DataType.SMEMBER(DataType.UINT, true),
      DataType.PLACEHOLDER,
    ], function(members) {
      if (members.length === 1) {
        return DataType.ARRAY(DataType.UINT, 0, members[0] - 1);
      }
    })
  ),
  OptionalServiceList: new Attribute(
    5,
    NeedCodes.Optional,
    AccessCodes.Get,
    'Optional Service List',
    DataType.STRUCT([
      DataType.SMEMBER(DataType.UINT, true),
      DataType.PLACEHOLDER,
    ], function (members) {
      if (members.length === 1) {
        return DataType.ARRAY(DataType.UINT, 0, members[0] - 1);
      }
    })
  ),
  MaximumIDNumberClassAttributes: new Attribute(
    6,
    NeedCodes.Conditional,
    AccessCodes.Get,
    'Maximum ID Number Class Attributes',
    DataType.UINT
  ),
  MaximumIDNumberInstanceAttributes: new Attribute(
    7,
    NeedCodes.Conditional,
    AccessCodes.Get,
    'Maximum ID Number Instance Attributes',
    DataType.UINT
  )
});


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




module.exports = {
  Classes,
  ClassNames,
  CommonServices,
  CommonServiceNames,
  DataTypeCodes,
  DataType,
  DataTypeNames,
  ReservedClassAttributes,
  GeneralStatusCodeNames,
  GeneralStatusCodeDescriptions,
  Decode,
  Encode,
  EncodeTo,
  EncodeSize,
  DecodeDataType
};