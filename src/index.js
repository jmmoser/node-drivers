'use strict';

module.exports = {
  Layers: {
    Layer: require('./Stack/Layers/Layer'),
    TCPLayer: require('./Stack/Layers/TCPLayer'),
    UDPLayer: require('./Stack/Layers/UDPLayer'),
    EIPLayer: require('./Stack/Layers/EIPLayer'),
    MBTCPLayer: require('./Stack/Layers/MBTCPLayer'),
    PCCCLayer: require('./Stack/Layers/PCCCLayer'),
    CIP: {
      Connection: require('./CIP/Objects/Connection'),
      Logix5000: require('./CIP/Logix5000'),
      PCCC: require('./CIP/PCCC')
    }
  }
}
