'use strict';

const CIPFeature = require('./feature');

class CIPAttribute extends CIPFeature {
  constructor(code, name, dataType, getable = true, setable = false) {
    super(code, name);
    this.dataType = dataType;
    this.getable = getable;
    this.setable = setable;
  }
}

CIPAttribute.Class = class CIPClassAttribute extends CIPAttribute {}
CIPAttribute.Instance = class CIPInstanceAttribute extends CIPAttribute {}

module.exports = CIPAttribute;