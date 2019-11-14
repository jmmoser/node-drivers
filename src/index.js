'use strict';

module.exports = {
  Layers: {
    TCP: require('./layers/tcp/TCPLayer'),
    UDP: require('./layers/udp/UDPLayer'),
    EIP: require('./layers/eip/EIPLayer'),
    ModbusTCP: require('./layers/modbus/MBTCPLayer'),
    PCCC: require('./layers/pccc/PCCCLayer'),
    CIP: {
      // Connection: require('./layers/cip/objects/Connection'),
      Modbus: require('./layers/cip/Modbus'),
      Logix5000: require('./layers/cip/Logix5000'),
      PCCC: require('./layers/cip/PCCC')
    }
  }
};

// module.exports = {
//   Layers: {
//     TCP: require('./Stack/Layers/TCPLayer'),
//     UDP: require('./Stack/Layers/UDPLayer'),
//     EIP: require('./Stack/Layers/EIPLayer'),
//     ModbusTCP: require('./Stack/Layers/MBTCPLayer'),
//     PCCC: require('./Stack/Layers/PCCCLayer'),
//     CIP: {
//       Connection: require('./CIP/Objects/Connection'),
//       Logix5000: require('./CIP/Logix5000'),
//       PCCC: require('./CIP/PCCC')
//     }
//   }
// };
