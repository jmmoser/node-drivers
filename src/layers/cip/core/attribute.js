'use strict';

const { DataType } = require('../datatypes/types');

const CIPFeature = require('./feature');

class CIPAttribute extends CIPFeature {
  constructor(code, name, dataType, getable = true, setable = false) {
    super(code, name);
    this.dataType = dataType;
    this.getable = getable;
    this.setable = setable;
  }
}

CIPAttribute.Class = class CIPClassAttribute extends CIPAttribute {
  static MaxInstance() {
    return new this(2, 'Max Instance', DataType.UINT)
  }
  static NumberOfInstances() {
    return new this(3, 'Number of Instances', DataType.UINT)
  }
}

CIPAttribute.Instance = class CIPInstanceAttribute extends CIPAttribute {}

module.exports = CIPAttribute;