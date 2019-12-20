'use strict';

const { InvertKeyValues } = require('../../utils');

const Functions = {
  ReadCoils: 0x01,
  ReadDiscreteInputs: 0x02,
  ReadHoldingRegisters: 0x03,
  ReadInputRegisters: 0x04,
  WriteSingleCoil: 0x05,
  WriteSingleHoldingRegister: 0x06,
  ReadExceptionStatus: 0x07,
  WriteMultipleCoils: 0x0F,
  WriteMultipleHoldingRegisters: 0x10,
  ReportSlaveID: 0x11,
  MaskWriteRegister: 0x16,
  WriteAndReadRegisters: 0x17
};

const FunctionNames = InvertKeyValues(Functions);


const ErrorDescriptions = {
  0x01: 'Illegal function',
  0x02: 'Illegal data address',
  0x03: 'Illegal data value',
  0x04: 'Slave or server failure',
  0x05: 'Acknowledge',
  0x06: 'Slave or server busy',
  0x07: 'Negative acknowledge',
  0x08: 'Memory parity',
  0x09: 'Not defined',
  0x0A: 'Gateway path',
  0x0B: 'Gateway target',
  0x0C: 'Max'
};


module.exports = {
  Functions,
  FunctionNames,
  ErrorDescriptions
};