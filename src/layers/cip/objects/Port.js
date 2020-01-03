'use strict';

/**
 * Definitions
 * 
 * Port - A CIP port is the abstraction for a physical network connection
 * to a CIP device. A CIP device has one port for each network connection.
 * Note: network specific definitions may include additional definitions
 * of this term within the context of the network.
 * 
 * Device - A physical hardware connection to the link. A device may
 * contain more than one node.
 * 
 * Node - A collection of objects that communicate over a subnet, and
 * arbitrates using a single MAC ID.  A physical device may contain one
 * or more nodes. Also, a connection to a link that requires a single MAC ID.
 * 
 * Link - Collection of nodes with unique MAC IDs. Segments connected by
 * repeaters make up a link; links connected by routers make up a network.
 * 
 * Segment - A collection of nodes connected to a single uninterrupted
 * section of physical media
 */

const CIPMetaObject = require('../core/object');
const CIPAttribute = require('../core/attribute');
const CIPFeatureGroup = require('../core/featuregroup');
const CIPRequest = require('../core/request');
const { ClassCodes, CommonServiceCodes } = require('../core/constants');
const EPath = require('../epath');
const { DataType } = require('../datatypes');



/** CIP Vol 3 Chapter 3-7.3 */
const PortTypeNames = Object.freeze({
  0: 'Connection terminates in this device',
  1: 'Reserved for compatibility with existing protocols (Backplane)',
  2: 'ControlNet',
  3: 'ControlNet redundant',
  4: 'EtherNet/IP',
  5: 'DeviceNet',
  200: 'CompoNet',
  201: 'Modbus/TCP',
  202: 'Modbus/SL',
  65535: 'Unconfigured port'
});



const ClassAttribute = Object.freeze({
  // MaxInstance: CIP
  // NumberOfInstances: CIPAttribute.Class.NumberOfInstances(),
  EntryPort: new CIPAttribute.Class(8, 'Entry Port', DataType.UINT),
  InstanceInfo: new CIPAttribute.Class(9, 'Instance Info', DataType.ABBREV_ARRAY(
    DataType.STRUCT([
      DataType.UINT, // Type
      DataType.UINT  // Number
    ])
  ))
});


const InstanceAttribute = Object.freeze({
  Type: new CIPAttribute.Instance(1, 'Type', DataType.TRANSFORM(
    DataType.UINT,
    function(value) {
      return {
        code: value,
        name: PortTypeNames[value] || 'Unknown'
      }
    }
  )),
  Number: new CIPAttribute.Instance(1, 'Number', DataType.UINT),
  Link: new CIPAttribute.Instance(3, 'Link', DataType.TRANSFORM(
    DataType.STRUCT([
      DataType.UINT,
      DataType.PLACEHOLDER(length => DataType.EPATH(true, length))
    ], function(members, dt) {
        if (members.length === 1) {
          return dt.resolve(2 * members[0]);
        }
      }
    ),
    function(value) {
      return value[1];
    }
  )),
  Name: new CIPAttribute.Instance(4, 'Name', DataType.SHORT_STRING),
  TypeName: new CIPAttribute.Instance(5, 'Type Name', DataType.SHORT_STRING),
  Description: new CIPAttribute.Instance(6, 'Description', DataType.SHORT_STRING),
  NodeAddress: new CIPAttribute.Instance(7, 'Node Address', DataType.EPATH(true)),
  NodeRange: new CIPAttribute.Instance(8, 'Node Range', DataType.STRUCT([
    DataType.UINT,
    DataType.UINT
  ])),
  Key: new CIPAttribute.Instance(9, 'Key', DataType.EPATH(false))
});


const ClassAttributeGroup = new CIPFeatureGroup(Object.values(ClassAttribute))
const InstanceAttributeGroup = new CIPFeatureGroup(Object.values(InstanceAttribute));


const InstanceGetAttributesAllOrder = Object.freeze([
  InstanceAttribute.Type,
  InstanceAttribute.Number,
  InstanceAttribute.Link,
  InstanceAttribute.Name,
  InstanceAttribute.NodeAddress
]);


const CIPObject = CIPMetaObject(
  ClassCodes.Port,
  ClassAttributeGroup,
  InstanceAttributeGroup,
  null
);


class Port extends CIPObject {
  static GetInstanceAttributesAll(instanceID) {
    return new CIPRequest(
      CommonServiceCodes.GetAttributesAll,
      EPath.Encode(true, [
        new EPath.Segments.Logical.ClassID(ClassCodes.Port),
        new EPath.Segments.Logical.InstanceID(instanceID)
      ]),
      null,
      (buffer, offset, cb) => {
        const attributes = [];
        InstanceGetAttributesAllOrder.forEach(attribute => {
          offset = this.DecodeInstanceAttribute(
            buffer,
            offset,
            attribute,
            val => attributes.push(val)
          );
        });
        if (typeof cb === 'function') {
          cb(attributes);
        }
        return offset;
      }
    );
  }
}

Port.InstanceAttribute = InstanceAttribute;
Port.ClassAttribute = ClassAttribute;

module.exports = Port;







// 'use strict';

// const {
//   InvertKeyValues
// } = require('../../../utils');

// const CIPRequest = require('../core/request');
// const { ClassCodes, CommonServiceCodes } = require('../core/constants');
// const EPath = require('../epath');
// const { DataType, Decode } = require('../datatypes');


// const InstanceAttributeCodes = Object.freeze({
//   Type: 1,
//   Number: 2,
//   Link: 3,
//   Name: 4,
//   TypeName: 5,
//   Description: 6,
//   NodeAddress: 7,
//   NodeRange: 8,
//   Key: 9
// });

// const InstanceAttributeNames = Object.freeze(InvertKeyValues(InstanceAttributeCodes));

// const InstanceAttributeDataTypes = Object.freeze({
//   [InstanceAttributeCodes.Type]: DataType.UINT,
//   [InstanceAttributeCodes.Number]: DataType.UINT,
//   [InstanceAttributeCodes.Link]: DataType.STRUCT([
//     DataType.SMEMBER(DataType.UINT, true),
//     DataType.PLACEHOLDER(length => DataType.EPATH(true, length))
//   ], function (members, dt) {
//     if (members.length === 1) {
//       return dt.resolve(2 * members[0]);
//     }
//   }),
//   [InstanceAttributeCodes.Name]: DataType.SHORT_STRING,
//   [InstanceAttributeCodes.TypeName]: DataType.SHORT_STRING,
//   [InstanceAttributeCodes.Description]: DataType.SHORT_STRING,
//   [InstanceAttributeCodes.NodeAddress]: DataType.EPATH(true),
//   [InstanceAttributeCodes.NodeRange]: DataType.STRUCT([DataType.UINT, DataType.UINT]),
//   [InstanceAttributeCodes.Key]: DataType.EPATH(false)
// });

// const InstanceGetAttributesAllOrder = Object.freeze([
//   InstanceAttributeCodes.Type,
//   InstanceAttributeCodes.Number,
//   InstanceAttributeCodes.Link,
//   InstanceAttributeCodes.Name,
//   InstanceAttributeCodes.NodeAddress
// ]);


// const ClassAttributeCodes = Object.freeze({
//   MaxInstance: 2,
//   NumberOfInstances: 3,
//   EntryPort: 8,
//   InstanceInfo: 9
// });

// const ClassAttributeNames = InvertKeyValues(ClassAttributeCodes);


// const ClassAttributeDataTypes = Object.freeze({
//   [ClassAttributeCodes.MaxInstance]: DataType.UINT,
//   [ClassAttributeCodes.NumberOfInstances]: DataType.UINT,
//   [ClassAttributeCodes.EntryPort]: DataType.UINT,
//   [ClassAttributeCodes.InstanceInfo]: DataType.ABBREV_ARRAY(
//     DataType.STRUCT([
//       InstanceAttributeDataTypes[InstanceAttributeCodes.Type],
//       InstanceAttributeDataTypes[InstanceAttributeCodes.Number]
//     ])
//   )
// });



// /** CIP Vol 3 Chapter 3-7.3 */
// const PortTypeNames = Object.freeze({
//   0: 'Connection terminates in this device',
//   1: 'Reserved for compatibility with existing protocols (Backplane)',
//   2: 'ControlNet',
//   3: 'ControlNet redundant',
//   4: 'EtherNet/IP',
//   5: 'DeviceNet',
//   200: 'CompoNet',
//   201: 'Modbus/TCP',
//   202: 'Modbus/SL',
//   65535: 'Unconfigured port'
// });


// class Port {
//   static DecodeClassAttribute(buffer, offset, attribute, cb) {
//     const dataType = ClassAttributeDataTypes[attribute];
//     if (!dataType) {
//       throw new Error(`Unknown class attribute: ${attribute}`);
//     }

//     let value;
//     offset = Decode(dataType, buffer, offset, val => value = val);

//     if (typeof cb === 'function') {
//       cb({
//         code: attribute,
//         name: ClassAttributeNames[attribute] || 'Unknown',
//         value
//       });
//     }
//     return offset;
//   }

//   static DecodeInstanceAttribute(attribute, data, offset, cb) {
//     const dataType = InstanceAttributeDataTypes[attribute];
//     if (!dataType) {
//       throw new Error(`Unknown instance attribute: ${attribute}`);
//     }

//     let value;
//     offset = Decode(dataType, data, offset, val => value = val);

//     switch (attribute) {
//       case InstanceAttributeCodes.Type: {
//         value = {
//           code: value,
//           name: PortTypeNames[value] || 'Unknown'
//         };
//         break;
//       }
//       case InstanceAttributeCodes.Link: {
//         if (Array.isArray(value) && value.length === 1) {
//           value = value[0];
//         }
//         break;
//       }
//       default:
//         break;
//     }

//     if (typeof cb === 'function') {
//       cb({
//         code: attribute,
//         name: InstanceAttributeNames[attribute] || 'Unknown',
//         value
//       });
//     }
//     return offset;
//   }


//   static DecodeInstanceGetAttributesAll(buffer, offset, cb) {
//     const attributes = []
//     InstanceGetAttributesAllOrder.forEach(attributeCode => {
//       offset = this.DecodeInstanceAttribute(
//         attributeCode,
//         buffer,
//         offset,
//         val => attributes.push(val)
//       );
//     });
//     if (typeof cb === 'function') {
//       cb(attributes);
//     }
//     return offset;
//   }


//   static GetInstanceAttributesAll(instanceID) {
//     return new CIPRequest(
//       CommonServiceCodes.GetAttributesAll,
//       EPath.Encode(true, [
//         new EPath.Segments.Logical.ClassID(ClassCodes.Port),
//         new EPath.Segments.Logical.InstanceID(instanceID)
//       ]),
//       null,
//       (buffer, offset, cb) => {
//         this.DecodeInstanceGetAttributesAll(buffer, offset, cb);
//       }
//     );
//   }


//   static GetClassAttributeRequest(attribute) {
//     return new CIPRequest(
//       CommonServiceCodes.GetAttributeSingle,
//       EPath.Encode(true, [
//         new EPath.Segments.Logical.ClassID(ClassCodes.Port),
//         new EPath.Segments.Logical.InstanceID(0),
//         new EPath.Segments.Logical.AttributeID(attribute)
//       ]),
//       null,
//       (buffer, offset, cb) => {
//         this.DecodeClassAttribute(buffer, offset, attribute, cb);
//       }
//     );
//   }
// }

// Port.InstanceAttribute = InstanceAttributeCodes;
// Port.ClassAttribute = ClassAttributeCodes;

// module.exports = Port;