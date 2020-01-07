'use strict';

module.exports = {
  Layers: {
    TCP: require('./layers/tcp/TCPLayer'),
    UDP: require('./layers/udp/UDPLayer'),
    EIP: require('./layers/eip/EIPLayer'),
    Modbus: require('./layers/modbus/MBLayer'),
    PCCC: require('./layers/pccc/PCCCLayer'),
    CIP: {
      Modbus: require('./layers/cip/Modbus'),
      Logix5000: require('./layers/cip/Logix5000'),
      PCCC: require('./layers/cip/PCCC'),
      Layer: require('./layers/cip/CIPLayer')
    }
  }
};