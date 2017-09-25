'use strict';

exports.Layers = {
  TCPLayer: require('./Stack/Layers/TCPLayer'),
  EIPLayer: require('./Stack/Layers/EIPLayer'),
  CIPLayer: require('./Stack/Layers/CIPLayer'),
  MBTCPLayer: require('./Stack/Layers/MBTCPLayer'),
  PCCCLayer: require('./Stack/Layers/PCCCLayer'),
  CIP: {
    Connection: require('./CIP/Objects/Connection'),
    ControlLogix: require('./CIP/ControlLogix'),
    PCCC: require('./CIP/PCCC')
  }
};
