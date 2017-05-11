'use strict';

exports.Layers = {
  TCPLayer: require('./Stack/Layers/TCPLayer'),
  EIPLayer: require('./Stack/Layers/EIPLayer'),
  CIPLayer: require('./Stack/Layers/CIPLayer'),
  MBTCPLayer: require('./Stack/Layers/MBTCPLayer')
};

exports.CIP = {
  ControlLogix: require('./CIP/ControlLogix'),
  Modbus: require('./CIP/Modbus'),
  PCCC: require('./CIP/PCCC')
};
