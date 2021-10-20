/* eslint-disable max-classes-per-file */

'use strict';

const CIPFeature = require('./feature');

class CIPService extends CIPFeature {}

CIPService.Class = class CIPClassService extends CIPService { };
CIPService.Instance = class CIPInstanceService extends CIPService { };

module.exports = CIPService;
