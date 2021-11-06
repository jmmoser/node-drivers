export const DataType = {
  Binary: 0x01,
  BitString: 0x02,
  Byte: 0x03,
  Integer: 0x04,
  Timer: 0x05,
  Counter: 0x06,
  Control: 0x07,
  Float: 0x08,
  Array: 0x09,
  Address: 0x0F,
  BCD: 0x10,
  PID: 0x15,
  Message: 0x16,
  SFCStatus: 0x1d,
  String: 0x1e,
  BlockTransfer: 0x20,
};

export const DataTypeNames = {
  [DataType.Binary]: 'Bit',
  [DataType.BitString]: 'Bit string',
  [DataType.Byte]: 'Byte (or character string)',
  [DataType.Integer]: 'Integer',
  [DataType.Timer]: 'Allen-Bradley timer',
  [DataType.Counter]: 'Allen-Bradley counter',
  [DataType.Control]: 'Allen-Bradley general control structure',
  [DataType.Float]: 'IEEE floating point',
  [DataType.Array]: 'Array of similar elements',
  [DataType.Address]: 'Address',
  [DataType.BCD]: 'Binary-coded decimal (BCD)',
  [DataType.PID]: 'PID',
  [DataType.Message]: 'Message',
  [DataType.SFCStatus]: 'SFC status',
  [DataType.String]: 'String',
  [DataType.BlockTransfer]: 'Block transfer',
};

export const ServiceCodes = {
  ExecutePCCC: 0x4B,
  ExecuteDHplus: 0x4C,
  ExecuteLocalPCCC: 0x4D,
};

export const ServiceNames = {
  0x4B: 'Exec PCCC Service',
  0x4C: 'DH+ Like Service',
  0x4D: 'Local PCCC Service',
};

/*
  Source: http://iatip.blogspot.com/2008/11/ethernetip-pccc-service-codes.html
  To force a DF1 message with destination=5 and source=2
  0x4c                                              - DH+ Like Service
  0x02 0x20 0x67 0x24 0x01                          - IOI to PCCC object
  0x00 0x00 0x02 0x00 0x00 0x00 0x05 0x00           - DH+ Like Header
  0x0F 0x00 0x5C 0x00 0xA2 0x14 0x07 0x89 0x00 0x00 - example pccc message

  The originator info has been swapped with an 8 byte struct of the form
  AA AA BB XX CC CC DD XX.
  "XX" are control bytes of some sort, just leave 0x00
  "AA AA" is the destination link
  "BB" is the destination node
  "CC CC" is the source link
  "DD" is the source node
*/

export const STSCodeDescriptions = {
  0: 'Success',

  1: 'Local: DST node is out of buffer space',
  2: 'Local: Cannot guarantee delivery: link layer (The remote node specified does not ACK command)',
  3: 'Local: Duplicate token holder detected',
  4: 'Local: Local port is disconnected',
  5: 'Local: Application layer timed out waiting for a response',
  6: 'Local: Duplicate node detected',
  7: 'Local: Station is offline',
  8: 'Local: Hardware fault',

  16: 'Remote: Illegal command or format',
  32: 'Remote: Host has a problem and will not communicate',
  48: 'Remote: Remote node host is missing, disconnected, or shut down',
  64: 'Remote: Host could not complete function due to hardware fault',
  80: 'Remote: Addressing problem or memory protect rungs',
  96: 'Remote: Function not allowed due to command protection selection',
  112: 'Remote: Processor is in Program mode',
  128: 'Remote: Compatibility mode file missing or communication zone problem',
  144: 'Remote: Remote node cannot buffer command',
  160: 'Remote: Wait ACK (1775-KA buffer full)',
  176: 'Remote: Remote node problem due to download',
  192: 'Remote: Wait ACK (1775-KA buffer full)',
  240: 'Remote: Error code in the EXT STS byte',
};

/** DF1 Manual, p. 8-4 */
export const EXTSTSCodeDescriptionsCMDF0 = {
  // 0: 'Not Used',
  1: 'A field has an illegal value',
  2: 'Less levels specified in address than minimum for any address',
  3: 'More levels specified in address than system supports',
  4: 'Symbol not found',
  5: 'Symbol is of improper format',
  6: 'Address doesn\'t point to something usable',
  7: 'File is wrong size',
  8: 'Cannot complete request, situation has changed since the start of the command',
  9: 'Data or file is too large',
  10: 'Transaction size plus word address is too large',
  11: 'Access denied, impropert privilege',
  12: 'Condition cannot be generated - resource is not available',
  13: 'Condition already exists - resource is already available',
  14: 'Command cannot be executed',
  15: 'Histogram overflow',
  16: 'No access',
  17: 'Illegal data type',
  18: 'Invalid parameter or invalid data',
  19: 'Address reference exists to deleted area',
  20: 'Command execution failure for unknown reason; possible PLC-3 histogram overflow',
  21: 'Data conversion error',
  22: 'Scanner not able to communicate with 1771 rack adapter',
  23: 'Type mismatch',
  24: '1771 module response was not valid',
  25: 'Duplicated label',
  26: 'File is open; another node owns it',
  27: 'Another node is the program owner',
  // 28: 'Reserved',
  // 29: 'Reserved',
  30: 'Data table element protection violation',
  31: 'Temporary internal problem',

  34: 'Remote rack fault',
  35: 'Timeout',
  36: 'Unknown error',
};
