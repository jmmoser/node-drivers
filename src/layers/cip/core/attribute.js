/* eslint-disable max-classes-per-file */

import { DecodeTypedData } from './datatypes/decoding.js';
import { CommonServiceCodes } from './constants/services.js';
import EPath from './epath/index.js';

import CIPRequest from './request.js';
import CIPFeature from './feature.js';

const LogicalSegment = EPath.Segments.Logical;

class CIPAttribute extends CIPFeature {
  constructor(code, name, dataType, classCode) {
    super(code, name, classCode);
    this.dataType = dataType;
  }

  Get(instance) {
    return new CIPRequest(
      CommonServiceCodes.GetAttributeSingle,
      EPath.Encode(true, [
        new LogicalSegment.ClassID(this.classCode),
        new LogicalSegment.InstanceID(instance),
        new LogicalSegment.AttributeID(this.code),
      ]),
      null,
      (buffer, offsetRef) => DecodeTypedData(buffer, offsetRef, this.dataType),
    );
  }
}

CIPAttribute.Class = class CIPClassAttribute extends CIPAttribute {
  Get(instance) {
    return super.Get(instance == null ? 0 : instance);
  }
};

CIPAttribute.Instance = class CIPInstanceAttribute extends CIPAttribute {
  Get(instance) {
    if (instance < 1) {
      throw new Error(`Instance must be greater than 0. Supplied instance ${instance}`);
    }
    return super.Get(instance);
  }
};

export default CIPAttribute;
