'use strict';

module.exports = {
  Layers: {
    // Layer: require('./Stack/Layers/Layer'),
    TCP: require('./Stack/Layers/TCPLayer'),
    UDP: require('./Stack/Layers/UDPLayer'),
    EIP: require('./Stack/Layers/EIPLayer'),
    ModbusTCP: require('./Stack/Layers/MBTCPLayer'),
    PCCC: require('./Stack/Layers/PCCCLayer'),
    CIP: {
      Connection: require('./CIP/Objects/Connection'),
      Logix5000: require('./CIP/Logix5000'),
      PCCC: require('./CIP/PCCC')
    }
  }
}
