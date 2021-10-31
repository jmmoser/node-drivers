export const PCCCDataType = {
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
