'use strict';

const {
  DataType,
  DataTypeCodes,
  DataTypeNames
} = require('../datatypes');


const {
  InvertKeyValues
} = require('../../../utils');

const {
  getBits
} = require('../../../utils');

// const {
//   Logix5000_DataType,
//   Logix5000_DatatypeNames
// } = require('./constants');


const Logix5000_DataTypeCodes = Object.freeze({
  Program: 0x68,
  Map: 0x69,
  Routine: 0x6D,
  Task: 0x70,
  Cxn: 0x7E
});

const Logix5000_DatatypeNames = InvertKeyValues(Logix5000_DataTypeCodes);

const Logix5000_DataType = Object.freeze({
  Program() {
    return { type: Logix5000_DataType.Program, code: Logix5000_DataTypeCodes.Program };
  },
  Map() {
    return { type: Logix5000_DataType.Map, code: Logix5000_DataTypeCodes.Map };
  },
  Routine() {
    return { type: Logix5000_DataType.Routine, code: Logix5000_DataTypeCodes.Routine };
  },
  Task() {
    return { type: Logix5000_DataType.Task, code: Logix5000_DataTypeCodes.Task };
  },
  Cxn() {
    return { type: Logix5000_DataType.Cxn, code: Logix5000_DataTypeCodes.Cxn };
  }
});


const Logix5000_ClassCodes = Object.freeze({
  Symbol: 0x6B,
  Template: 0x6C,
  Controller: 0xAC
});



/** 1756-PM020, pg. 16 */
const SymbolServiceCodes = Object.freeze({
  Read: 0x4C,
  ReadFragmented: 0x52,
  WriteTag: 0x4D,
  WriteTagFragmented: 0x53,
  ReadModifyWriteTag: 0x4E,
  // MultipleServicePacket: 0x0A, // Common service defined by CIP

  GetInstanceAttributeList: 0x55
});

const SymbolServiceNames = InvertKeyValues(SymbolServiceCodes);


const SymbolInstanceAttributeCodes = Object.freeze({
  Name: 0x01,
  Type: 0x02,
  Bytes: 0x07,
  ArrayDimensionLengths: 0x08,
  Unknown3: 3,
  Unknown5: 5,
  Unknown6: 6,
  Unknown9: 9,
  Unknown10: 10,
  Unknown11: 11
});

const SymbolInstanceAttributeNames = InvertKeyValues(SymbolInstanceAttributeCodes);

/**
 * Possible remaining attributes:
 * - External Access
 *    Defines how an external application, such as an HMI, historian, or OPC data server, can access a tag. For arrays, this
 *    feature applies to the top level only; for user-defined structure, this feature applies to individual members. Possible
 *    values are:
 *      - Read/Write: External applications can both read and modify the tag’s value
 *      - Read Only: External applications can read the tag’s value, but not modify it
 *      - None: External applications can neither read or write the tag’s value
 * - Constant
 *    Defines whether a tag value remains constant. Tags with this attribute set cannot be changed programmatically.)
 */
const SymbolInstanceAttributeDataTypes = Object.freeze({
  [SymbolInstanceAttributeCodes.Name]: DataType.STRING,
  [SymbolInstanceAttributeCodes.Type]: DataType.TRANSFORM(DataType.UINT, val => new SymbolType(val)),
  [SymbolInstanceAttributeCodes.Bytes]: DataType.UINT,
  [SymbolInstanceAttributeCodes.ArrayDimensionLengths]: DataType.ARRAY(DataType.UDINT, 0, 2),
  [SymbolInstanceAttributeCodes.Unknown3]: DataType.UNKNOWN(4),
  [SymbolInstanceAttributeCodes.Unknown5]: DataType.UNKNOWN(4),
  [SymbolInstanceAttributeCodes.Unknown6]: DataType.UNKNOWN(4),
  [SymbolInstanceAttributeCodes.Unknown9]: DataType.UNKNOWN(1),
  [SymbolInstanceAttributeCodes.Unknown10]: DataType.UNKNOWN(1),
  [SymbolInstanceAttributeCodes.Unknown11]: DataType.UNKNOWN(1)
});


const TemplateServiceCodes = Object.freeze({
  Read: 0x4C
});


const TemplateInstanceAttributeCodes = Object.freeze({
  StructureHandle: 0x01, /** Calculated CRC value for members of the structure */
  MemberCount: 0x02, /** Number of members defined in the structure */
  DefinitionSize: 0x04, /** Size of the template definition structure */
  StructureSize: 0x05 /** Number of bytes transferred on the wire when the structure is read using the Read Tag service */
});

const TemplateInstanceAttributeDataTypes = Object.freeze({
  [TemplateInstanceAttributeCodes.StructureHandle]: DataType.UINT,
  [TemplateInstanceAttributeCodes.MemberCount]: DataType.UINT,
  [TemplateInstanceAttributeCodes.DefinitionSize]: DataType.UDINT,
  [TemplateInstanceAttributeCodes.StructureSize]: DataType.UDINT
});


const TemplateClassAttributeCodes = Object.freeze({
  Unknown1: 1,
  Unknown2: 2,
  Unknown3: 3,
  Unknown8: 8
});

const TemplateClassAttributeDataTypes = Object.freeze({
  [TemplateClassAttributeCodes.Unknown1]: DataType.UNKNOWN(2),
  [TemplateClassAttributeCodes.Unknown2]: DataType.UNKNOWN(4),
  [TemplateClassAttributeCodes.Unknown3]: DataType.UNKNOWN(4),
  [TemplateClassAttributeCodes.Unknown8]: DataType.UNKNOWN(4),
});


const ControllerInstanceAttributeCodes = Object.freeze({
  Unknown1: 1,
  Unknown2: 2,
  Unknown3: 3,
  Unknown4: 4,
  Unknown10: 10
});

const ControllerInstanceAttributeNames = InvertKeyValues(ControllerInstanceAttributeCodes);

const ControllerInstanceAttributeDataTypes = Object.freeze({
  [ControllerInstanceAttributeCodes.Unknown1]: DataType.UINT,
  [ControllerInstanceAttributeCodes.Unknown2]: DataType.UINT,
  [ControllerInstanceAttributeCodes.Unknown3]: DataType.UDINT,
  [ControllerInstanceAttributeCodes.Unknown4]: DataType.UDINT,
  [ControllerInstanceAttributeCodes.Unknown10]: DataType.UDINT
});

const GenericServiceStatusDescriptions = {
  0x04: 'A syntax error was detected decoding the Request Path',
  0x05: 'Request Path destination unknown',
  0x06: 'Insufficient Packet Space: Not enough room in the response buffer for all the data',
  0x10: {
    0x2101: 'Device state conflict: keyswitch position: The requestor is attempting to change force information in HARD RUN mode',
    0x2802: 'Device state conflict: Safety Status: The controller is in a state in which Safety Memory cannot be modified'
  },
  0x0A: 'Attribute list error, generally attribute not supported. The status of the unsupported attribute will be 0x14.',
  0x13: 'Insufficient Request Data: Data too short for expected parameters',
  0x1C: 'Attribute List Shortage: The list of attribute numbers was too few for the number of attributes parameter.',
  0x26: 'The Request Path Size received was shorter or longer than expected',
  0xFF: {
    0x2104: 'General Error: Offset is beyond end of the requested object',
    0x2105: 'General Error: Number of Elements extends beyond the end of the requested object',
    0x2107: 'General Error: Object type used in request does not match the target object\'s data type'
  }
};


class SymbolType {
  constructor(code) {
    this.code = code;
    this.atomic = getBits(code, 15, 16) === 0;
    this.system = getBits(code, 12, 13) > 0;
    this.dimensions = getBits(code, 13, 15);

    let dataType;

    if (this.atomic) {
      const dataTypeCode = getBits(code, 0, 8);
      if (dataTypeCode === DataTypeCodes.BOOL) {
        dataType = DataType.BOOL(getBits(code, 8, 11));
      } else {
        const dataTypeName = DataTypeNames[dataTypeCode] || Logix5000_DatatypeNames[dataTypeCode] || 'Unknown';
        if (dataTypeName) {
          dataType = DataType[dataTypeName] || Logix5000_DataType[dataTypeName];
          if (typeof dataType === 'function') {
            dataType = dataType();
          }
        }
      }
    } else {
      const templateID = getBits(code, 0, 12);
      this.template = {
        id: templateID
      };

      dataType = DataType.ABBREV_STRUCT;
    }
    this.dataType = dataType;
  }
}


class Member {
  constructor(typeCode, info, offset, name, host) {
    this.type = new SymbolType(typeCode);
    this.info = info;
    this.offset = offset;
    this.name = name;
    this.host = !!host;
  }
}


module.exports = {
  Logix5000_DataTypeCodes,
  Logix5000_DatatypeNames,
  Logix5000_DataType,
  Logix5000_ClassCodes,
  SymbolServiceCodes,
  SymbolServiceNames,
  SymbolInstanceAttributeCodes,
  SymbolInstanceAttributeNames,
  SymbolInstanceAttributeDataTypes,
  // SymbolServiceErrorDescriptions,
  TemplateServiceCodes,
  TemplateClassAttributeCodes,
  TemplateClassAttributeDataTypes,
  TemplateInstanceAttributeCodes,
  TemplateInstanceAttributeDataTypes,
  // TemplateServiceErrorDescriptions,
  GenericServiceStatusDescriptions,
  Member,
  SymbolType,
  ControllerInstanceAttributeCodes,
  ControllerInstanceAttributeDataTypes,
  ControllerInstanceAttributeNames
};