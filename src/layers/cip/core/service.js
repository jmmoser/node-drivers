'use strict';

const CIPFeature = require('./feature');

class CIPService extends CIPFeature {
  constructor(code, name) {
    super(code, name);
  }
}

CIPService.Class = class CIPClassService extends CIPService { }
CIPService.Instance = class CIPInstanceService extends CIPService { }

module.exports = CIPService;