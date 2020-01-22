'use strict';

const CIPInternalLayer = require('./layers/internal/CIPInternalLayer');


class CIPLayer extends CIPInternalLayer {}

CIPLayer.EIP = require('./layers/EIP');
CIPLayer.Logix5000 = require('./layers/Logix5000');
CIPLayer.Core = require('./core');

module.exports = CIPLayer;