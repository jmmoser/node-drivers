'use strict';

module.exports = {
  Layers: {
    TCP: require('./layers/tcp/TCPLayer'),
    UDP: require('./layers/udp/UDPLayer'),
    Modbus: require('./layers/modbus/MBLayer'),
    PCCC: require('./layers/pccc'),
    CIP: require('./layers/cip')
  }
};