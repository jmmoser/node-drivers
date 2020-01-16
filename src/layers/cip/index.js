'use strict';

const CIPLayer = require('./layers/internal/CIPLayer');

CIPLayer.Logix5000 = require('./layers/Logix5000');
// CIPLayer.PCCC = require('./layers/PCCC');
// CIPLayer.Modbus = require('./layers/Modbus');
CIPLayer.EIP = require('./layers/EIP');

module.exports = CIPLayer;