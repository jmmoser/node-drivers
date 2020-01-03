'use strict';

const CIPMetaObject = require('../core/object');
const CIPAttribute = require('../core/attribute');
const CIPFeatureGroup = require('../core/featuregroup');

const {
  ClassCodes,
  ClassNames
} = require('../core/constants');

const {
  DataType
} = require('../datatypes');


const CLASS_CODE = ClassCodes.MessageRouter;

const ClassAttribute = Object.freeze({});

const InstanceAttribute = Object.freeze({
  ObjectList: new CIPAttribute.Instance(1, 'Object List', DataType.TRANSFORM(
    DataType.STRUCT([
      DataType.UINT,
      DataType.PLACEHOLDER(length => DataType.ABBREV_ARRAY(DataType.UINT, length))
    ], function (members, placeholder) {
      if (members.length === 1) {
        return placeholder.resolve(members[0]);
      }
    }),
    function (value) {
      return value[1].sort(function (o1, o2) {
        if (o1 < o2) return -1;
        else if (o1 > o2) return 1;
        return 0;
      }).map(classCode => ({
        code: classCode,
        name: ClassNames[classCode] || 'Unknown'
      }));
    }
  )),
  MaxSupportedConnections: new CIPAttribute.Instance(2, 'Max Supported Connected', DataType.UINT),
  NumberOfActiveConnections: new CIPAttribute.Instance(3, 'Number of Active Connections', DataType.UINT),
  ActiveConnections: new CIPAttribute.Instance(4, 'Active Connections', DataType.ABBREV_ARRAY(DataType.UINT, true))
});

const CIPObject = CIPMetaObject(
  CLASS_CODE,
  new CIPFeatureGroup(Object.values(ClassAttribute)),
  new CIPFeatureGroup(Object.values(InstanceAttribute))
);


class MessageRouter extends CIPObject {

}

MessageRouter.InstanceAttribute = InstanceAttribute;
MessageRouter.ClassAttribute = ClassAttribute;

module.exports = MessageRouter;



// 'use strict';

// const { InvertKeyValues } = require('../../../utils');

// const CIPAttribute = require('../core/attribute');
// const CIPFeatureGroup = require('../core/featuregroup');
// const CIPRequest = require('../core/request');

// const {
//   ClassCodes,
//   ClassNames,
//   CommonServiceCodes,
//   CommonServiceNames,
//   GeneralStatusNames,
//   GeneralStatusDescriptions
// } = require('../core/constants');

// const EPath = require('../epath');

// const {
//   Decode,
//   DataType
// } = require('../datatypes');


// const InstanceAttributeCodes = Object.freeze({
//   ObjectList: 1,
//   MaxSupportedConnections: 2,
//   NumberOfActiveConnections: 3,
//   ActiveConnections: 4
// });

// const InstanceAttributeNames = InvertKeyValues(InstanceAttributeCodes);

// const InstanceAttributeDataTypes = Object.freeze({
//   [InstanceAttributeCodes.ObjectList]: DataType.TRANSFORM(
//     DataType.STRUCT([
//       DataType.UINT,
//       DataType.PLACEHOLDER(length => DataType.ABBREV_ARRAY(DataType.UINT, length))
//     ], function(members, placeholder) {
//       if (members.length === 1) {
//         return placeholder.resolve(members[0]);
//       }
//     }),
//     function (members) {
//       const list = members[1];
//       return list.sort(function (o1, o2) {
//         if (o1 < o2) return -1;
//         else if (o1 > o2) return 1;
//         return 0;
//       }).map(classCode => ({
//         code: classCode,
//         name: ClassNames[classCode] || 'Unknown'
//       }));
//     }
//   ),
//   [InstanceAttributeCodes.MaxSupportedConnections]: DataType.UINT,
//   [InstanceAttributeCodes.NumberOfActiveConnections]: DataType.UINT,
//   [InstanceAttributeCodes.ActiveConnections]: DataType.ABBREV_ARRAY(DataType.UINT, true)
// });


// const ClassAttributeCodes = Object.freeze({});
// const ClassAttributeNames = InvertKeyValues(ClassAttributeCodes);



// class MessageRouter {
//   static Request(service, path, data) {
//     let offset = 0;

//     const dataIsBuffer = Buffer.isBuffer(data)
//     const dataLength = dataIsBuffer ? data.length : 0;

//     const buffer = Buffer.allocUnsafe(2 + path.length + dataLength);
//     offset = buffer.writeUInt8(service, offset);
//     offset = buffer.writeUInt8(path.length / 2, offset);
//     offset += path.copy(buffer, offset);
    
//     if (dataIsBuffer) {
//       offset += data.copy(buffer, offset);
//     }

//     return buffer;
//   }


//   static Reply(buffer) {
//     let offset = 0;
//     const res = {};
//     res.buffer = buffer;
//     // res.service = buffer.readUInt8(offset); offset += 1;
//     const service = buffer.readUInt8(offset) & 0x7F; offset += 1;
    
//     res.service = {
//       code: service,
//       hex: `0x${service.toString(16)}`,
//       name: CommonServiceNames[service] || 'Unknown'
//     };

//     offset += 1; // reserved

//     const statusCode = buffer.readUInt8(offset); offset += 1;

//     res.status = {};
//     res.status.code = statusCode;
//     res.status.name = GeneralStatusNames[statusCode] || '';
//     res.status.description = GeneralStatusDescriptions[statusCode] || '';
//     res.status.error = statusCode !== 0 && statusCode !== 6;

//     const extendedStatusSize = buffer.readUInt8(offset); offset += 1; // number of 16 bit words
//     res.status.extended = buffer.slice(offset, offset + 2 * extendedStatusSize);
//     offset += 2 * extendedStatusSize;

//     res.data = buffer.slice(offset);
//     return res;
//   }


//   static DecodeInstanceAttribute(data, offset, attribute, cb) {
//     const dataType = InstanceAttributeDataTypes[attribute];
//     if (!dataType) {
//       console.log(attribute);
//       throw new Error(`Unknown instance attribute: ${attribute}`);
//     }

//     let value;
//     offset = Decode(dataType, data, offset, val => value = val);

//     if (typeof cb === 'function') {
//       cb({
//         code: attribute,
//         name: InstanceAttributeNames[attribute] || 'Unknown',
//         value
//       });
//     }
//     return offset;
//   }


//   static GetInstanceAttribute(instanceID, attribute) {
//     return new CIPRequest(
//       CommonServiceCodes.GetAttributeSingle,
//       EPath.Encode(true, [
//         new EPath.Segments.Logical.ClassID(ClassCodes.MessageRouter),
//         new EPath.Segments.Logical.InstanceID(instanceID),
//         new EPath.Segments.Logical.AttributeID(attribute)
//       ]),
//       null,
//       (buffer, offset, cb) => {
//         this.DecodeInstanceAttribute(buffer, offset, attribute, cb);
//       }
//     );
//   }


//   static DecodeGetClassAttributesAll(data, offset, cb) {
//     const info = {};
//     info.data = data;
//     const length = data.length;

//     if (offset < length) {
//       offset = Decode(DataType.UINT, data, offset, val => info.revision = val);
//     }

//     if (offset < length) {
//       offset = Decode(DataType.UINT, data, offset, val => info.maxInstanceID = val);
//     }

//     if (offset < length) {
//       offset = Decode(DataType.UINT, data, offset, val => info.numberOfInstances = val);
//     }

//     if (offset < length) {
//       let numberOfOptionalAttributes;
//       offset = Decode(DataType.UINT, data, offset, val => numberOfOptionalAttributes = val);

//       info.optionalAttributes = [];
//       for (let i = 0; i < numberOfOptionalAttributes; i++) {
//         if (offset < length) {
//           offset = Decode(DataType.UINT, data, offset, val => info.optionalAttributes.push(val));
//         } else {
//           console.log('breaking optional attributes');
//           break;
//         }
//       }

//       console.log({
//         numberOfOptionalAttributes,
//         length: info.optionalAttributes.length
//       });
//     }

//     if (offset < length) {
//       let numberOfOptionalServices;
//       offset = Decode(DataType.UINT, data, offset, val => numberOfOptionalServices = val);

//       info.optionalServices = [];
//       for (let i = 0; i < numberOfOptionalServices; i++) {
//         if (offset < length) {
//           offset = Decode(DataType.UINT, data, offset, val => info.optionalServices.push({
//             code: val,
//             name: CommonServiceNames[val] || 'Unknown',
//             hex: `0x${val.toString('16')}`
//           }));
//         } else {
//           console.log('breaking optional services');
//           break;
//         }
//       }
//     }

//     if (offset < length) {
//       offset = Decode(DataType.UINT, data, offset, val => info.maxIDNumberOfClassAttributes = val);
//     }

//     if (offset < length) {
//       offset = Decode(DataType.UINT, data, offset, val => info.maxIDNumberOfInstanceAttributes = val);
//     }

//     info.extra = data.slice(offset);

//     cb(info);

//     return offset;
//   }
// }

// MessageRouter.InstanceAttribute = InstanceAttributeCodes;
// MessageRouter.ClassAttribute = ClassAttributeCodes;

// module.exports = MessageRouter;