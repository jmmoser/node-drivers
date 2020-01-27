'use strict';

const { Decode } = require('./datatypes/decoding');
const { CommonServiceCodes } = require('./constants/services');
const EPath = require('./epath');
const LogicalSegment = EPath.Segments.Logical;

const CIPRequest = require('./request');
const CIPFeature = require('./feature');

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
        new LogicalSegment.AttributeID(this.code)
      ]),
      null,
      (buffer, offset, cb) => {
        Decode(this.dataType, buffer, offset, cb);
      }
    );
  }
}

CIPAttribute.Class = class CIPClassAttribute extends CIPAttribute {
  Get(instance) {
    return super.Get(instance == null ? 0 : instance);
  }
}
CIPAttribute.Instance = class CIPInstanceAttribute extends CIPAttribute { }

module.exports = CIPAttribute;



// 'use strict';

// const CIPRequest
// const CIPFeature = require('./feature');

// class CIPAttribute extends CIPFeature {
//   constructor(code, name, dataType, getable = true, setable = false) {
//     super(code, name);
//     this.dataType = dataType;
//     this.getable = getable;
//     this.setable = setable;
//   }

//   request() {

//   }
// }

// CIPAttribute.Class = class CIPClassAttribute extends CIPAttribute {}
// CIPAttribute.Instance = class CIPInstanceAttribute extends CIPAttribute {}

// module.exports = CIPAttribute;