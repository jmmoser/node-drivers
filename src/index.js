'use strict';

exports.Layers = {
  TCPLayer: require('./Stack/Layers/TCPLayer'),
  EIPLayer: require('./Stack/Layers/EIPLayer'),
  CIPLayer: require('./Stack/Layers/CIPLayer'),
  MBTCPLayer: require('./Stack/Layers/MBTCPLayer'),
  PCCCLayer: require('./Stack/Layers/PCCCLayer')
};

exports.CIP = {
  ControlLogix: require('./CIP/ControlLogix'),
  Connection: require('./CIP/Objects/Connection'),
  Modbus: require('./CIP/Modbus'),
  PCCC: require('./CIP/PCCC')
};
