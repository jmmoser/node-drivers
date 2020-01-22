'use strict';

module.exports = {
  TCP: require('./layers/tcp'),
  UDP: require('./layers/udp'),
  Modbus: require('./layers/modbus'),
  PCCC: require('./layers/pccc'),
  CIP: require('./layers/cip'),
  Extras: require('./layers/extras')
};