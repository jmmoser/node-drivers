
const { DataTypes } = require('../objects/CIP');


const {
  InvertKeyValues
} = require('../../../utils');


const LDataTypeCodes = {
  Program: 0x68,
  Map: 0x69,
  Routine: 0x6D,
  Task: 0x70,
  Cxn: 0x7E
};

const LDatatypeNames = InvertKeyValues(LDataTypeCodes);


const ClassCodes = {
  Symbol: 0x6B,
  Template: 0x6C
};



/** 1756-PM020, pg. 16 */
const SymbolServiceCodes = {
  ReadTag: 0x4C,
  ReadTagFragmented: 0x52,
  WriteTag: 0x4D,
  WriteTagFragmented: 0x53,
  ReadModifyWriteTag: 0x4E,
  MultipleServicePacket: 0x0A,

  GetInstanceAttributeList: 0x55
};

const SymbolServiceNames = InvertKeyValues(SymbolServiceCodes);


// const SymbolServiceErrorDescriptions = {
//   [SymbolServiceCodes.ReadTag]: {
//     0x04: 'A syntax error was detected decoding the Request Path',
//     0x05: 'Request Path destination unknown: Probably instance number is not present',
//     0x06: 'Insufficient Packet Space: Not enough room in the response buffer for all the data',
//     0x13: 'Insufficient Request Data: Data too short for expected parameters',
//     0x26: 'The Request Path Size received was shorter or longer than expected',
//     0xFF: {
//       0x2105: 'General Error: Access beyond end of the object',
//     }
//   },
//   [SymbolServiceCodes.ReadTagFragmented]: {
//     0x04: 'A syntax error was detected decoding the Request Path',
//     0x05: 'Request Path destination unknown: Probably instance number is not present',
//     0x06: 'Insufficient Packet Space: Not enough room in the response buffer for all the data',
//     0x13: 'Insufficient Request Data: Data too short for expected parameters',
//     0x26: 'The Request Path Size received was shorter or longer than expected',
//     0xFF: {
//       0x2105: 'General Error: Number of Elements or Byte Offset is beyond the end of the requested tag',
//     }
//   },
//   [SymbolServiceCodes.WriteTag]: {
//     0x04: 'A syntax error was detected decoding the Request Path.',
//     0x05: 'Request Path destination unknown: Probably instance number is not present',
//     0x10: {
//       0x2101: 'Device state conflict: keyswitch position: The requestor is attempting to change force information in HARD RUN mode',
//       0x2802: 'Device state conflict: Safety Status: The controller is in a state in which Safety Memory cannot be modified'
//     },
//     0x13: 'Insufficient Request Data: Data too short for expected parameters',
//     0x26: 'The Request Path Size received was shorter or longer than expected',
//     0xFF: {
//       0x2105: 'General Error: Number of Elements extends beyond the end of the requested tag',
//       0x2107: 'General Error: Tag type used in request does not match the target tag\'s data type'
//     }
//   },
//   [SymbolServiceCodes.WriteTagFragmented]: {
//     0x04: 'A syntax error was detected decoding the Request Path.',
//     0x05: 'Request Path destination unknown: Probably instance number is not present',
//     0x10: {
//       0x2101: 'Device state conflict: keyswitch position: The requestor is attempting to change force information in HARD RUN mode',
//       0x2802: 'Device state conflict: Safety Status: The controller is in a state in which Safety Memory cannot be modified'
//     },
//     0x13: 'Insufficient Request Data: Data too short for expected parameters',
//     0x26: 'The Request Path Size received was shorter or longer than expected',
//     0xFF: {
//       0x2104: 'General Error: Offset is beyond end of the requested tag',
//       0x2105: 'General Error: Number of Elements extends beyond the end of the requested tag',
//       0x2107: 'General Error: Tag type used in request does not match the target tag\'s data type'
//     }
//   }
// }

const SymbolInstanceAttributeCodes = {
  Name: 0x01,
  Type: 0x02,
  Bytes: 0x07,
  ArrayDimensions: 0x08
};

const SymbolInstanceAttributeNames = InvertKeyValues(SymbolInstanceAttributeCodes);

const SymbolInstanceAttributeDataTypes = {
  [SymbolInstanceAttributeCodes.Name]: DataTypes.STRING,
  [SymbolInstanceAttributeCodes.Type]: DataTypes.UINT,
  [SymbolInstanceAttributeCodes.Bytes]: DataTypes.UINT
  // TODO: Added ArrayDimensions once compound DataTypes are added
};


const TemplateServiceCodes = {
  Read: 0x4C
};


const TemplateInstanceAttributeCodes = {
  StructureHandle: 0x01, /** Calculated CRC value for members of the structure */
  MemberCount: 0x02, /** Number of members defined in the structure */
  DefinitionSize: 0x04, /** Size of the template definition structure */
  StructureSize: 0x05 /** Number of bytes transferred on the wire when the structure is read using the Read Tag service */
};

const TemplateInstanceAttributeDataTypes = {
  [TemplateInstanceAttributeCodes.StructureHandle]: DataTypes.UINT,
  [TemplateInstanceAttributeCodes.MemberCount]: DataTypes.UINT,
  [TemplateInstanceAttributeCodes.DefinitionSize]: DataTypes.UDINT,
  [TemplateInstanceAttributeCodes.StructureSize]: DataTypes.UDINT
};


// const TemplateServiceErrorDescriptions = {
//   [CommonServices.GetAttributeList]: {
//     0x04: {
//       0x0000: 'A syntax error was detected decoding the Request Path.'
//     },
//     0x05: {
//       0x0000: 'Request Path destination unknown: probably instance number is not present.'
//     },
//     0x06: 'Insufficient Packet Space: Not enough room in the response buffer for all the data.',
//     0x0A: 'Attribute list error, generally attribute not supported. The status of the unsupported attribute will be 0x14.',
//     0x1C: 'Attribute List Shortage: The list of attribute numbers was too few for the number of attributes parameter.',
//     0x26: 'The Request Path Size received was shorter than expected.'
//   }
// };


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


module.exports = {
  LDataTypeCodes,
  LDatatypeNames,
  ClassCodes,
  SymbolServiceCodes,
  SymbolServiceNames,
  SymbolInstanceAttributeCodes,
  SymbolInstanceAttributeNames,
  SymbolInstanceAttributeDataTypes,
  // SymbolServiceErrorDescriptions,
  TemplateServiceCodes,
  TemplateInstanceAttributeCodes,
  TemplateInstanceAttributeDataTypes,
  // TemplateServiceErrorDescriptions,
  GenericServiceStatusDescriptions
};