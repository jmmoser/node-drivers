'use strict';

const {
  InvertKeyValues
} = require('../../../utils');

const CIPObject = require('./CIPObject');
const MessageRouter = require('./MessageRouter');
const { Classes, CommonServices } = require('./CIP');
const EPath = require('../epath');

const { DataType, Decode, Encode } = require('../datatypes');
// const {
//   DataType,
//   Decode
// } = require('./CIP');


const InstanceAttributeCodes = Object.freeze({
  Type: 1,
  Number: 2,
  Link: 3,
  Name: 4,
  TypeName: 5,
  Description: 6,
  NodeAddress: 7,
  NodeRange: 8,
  Key: 9
});

const InstanceAttributeNames = Object.freeze(InvertKeyValues(InstanceAttributeCodes));

const InstanceAttributeDataTypes = Object.freeze({
  [InstanceAttributeCodes.Type]: DataType.UINT,
  [InstanceAttributeCodes.Number]: DataType.UINT,
  [InstanceAttributeCodes.Link]: DataType.STRUCT([
    DataType.SMEMBER(DataType.UINT, true),
    DataType.PLACEHOLDER((padded, length) => DataType.EPATH(padded, length))
  ], function (members, dt) {
    // console.log(members);
    if (members.length === 1) {
      // console.log(`Setting epath length: ${2 * members[0]}`);
      return dt.resolve(true, 2 * members[0]);
      // return DataType.EPATH(true, 2 * members[0]);
    }
  }),
  [InstanceAttributeCodes.Name]: DataType.SHORT_STRING,
  [InstanceAttributeCodes.TypeName]: DataType.SHORT_STRING,
  [InstanceAttributeCodes.Description]: DataType.SHORT_STRING,
  [InstanceAttributeCodes.NodeAddress]: DataType.EPATH(true),
  [InstanceAttributeCodes.NodeRange]: DataType.STRUCT([DataType.UINT, DataType.UINT]),
  [InstanceAttributeCodes.Key]: DataType.EPATH(false)
});

const InstanceGetAttributesAllOrder = Object.freeze([
  InstanceAttributeCodes.Type,
  InstanceAttributeCodes.Number,
  InstanceAttributeCodes.Link,
  InstanceAttributeCodes.Name,
  InstanceAttributeCodes.NodeAddress
]);


const ClassAttributeCodes = Object.freeze({
  MaxInstance: 2,
  NumberOfInstances: 3,
  EntryPort: 8,
  InstanceInfo: 9
});

const ClassAttributeNames = InvertKeyValues(ClassAttributeCodes);


const ClassAttributeDataTypes = Object.freeze({
  // [ClassAttributeCodes.InstanceInfo]: DataType.ARRAY(
  //   DataType.STRUCT([
  //     // DataType.UINT, // Port Type
  //     // DataType.UINT // Port Number
  //     InstanceAttributeDataTypes[InstanceAttributeCodes.Type],
  //     InstanceAttributeDataTypes[InstanceAttributeCodes.Number]
  //   ])
  // )
  [ClassAttributeCodes.MaxInstance]: DataType.UINT,
  [ClassAttributeCodes.NumberOfInstances]: DataType.UINT,
  [ClassAttributeCodes.EntryPort]: DataType.UINT,
  [ClassAttributeCodes.InstanceInfo]: DataType.ABBREV_ARRAY(
    DataType.STRUCT([
      // DataType.UINT, // Port Type
      // DataType.UINT // Port Number
      InstanceAttributeDataTypes[InstanceAttributeCodes.Type],
      InstanceAttributeDataTypes[InstanceAttributeCodes.Number]
    ])
  )
});



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


class Port extends CIPObject {
  constructor() {
    super();
  }

  static DecodeClassAttribute(buffer, offset, attribute, cb) {
    const dataType = ClassAttributeDataTypes[attribute];
    if (!dataType) {
      throw new Error(`Unknown class attribute: ${attribute}`);
    }

    let value;
    offset = Decode(dataType, buffer, offset, val => value = val);

    if (typeof cb === 'function') {
      cb({
        code: attribute,
        name: ClassAttributeNames[attribute] || 'Unknown',
        value
      });
    }
    return offset;
  }

  static DecodeInstanceAttribute(attribute, data, offset, cb) {
    const dataType = InstanceAttributeDataTypes[attribute];
    if (!dataType) {
      throw new Error(`Unknown instance attribute: ${attribute}`);
    }

    let value;
    offset = Decode(dataType, data, offset, val => value = val);
    // const raw = value;

    switch (attribute) {
      case InstanceAttributeCodes.Type: {
        value = {
          code: value,
          name: PortTypeNames[value] || 'Unknown'
        };
        break;
      }
      case InstanceAttributeCodes.Link: {
        if (Array.isArray(value) && value.length === 1) {
          value = value[0];
        }
        break;
      }
      default:
        break;
    }

    if (typeof cb === 'function') {
      cb({
        code: attribute,
        name: InstanceAttributeNames[attribute] || 'Unknown',
        value,
        // raw
      });
    }
    return offset;
  }


  static DecodeInstanceGetAttributesAll(buffer, offset, cb) {
    const attributes = []
    InstanceGetAttributesAllOrder.forEach((attributeCode) => {
      offset = this.DecodeInstanceAttribute(attributeCode, buffer, offset, val => attributes.push(val));
    });
    if (typeof cb === 'function') {
      cb(attributes);
    }
    return offset;
  }


  static GetInstanceAttributesAll(instanceID) {
    return MessageRouter.Request(
      CommonServices.GetAttributesAll,
      EPath.Encode(true, [
        new EPath.Segments.Logical.ClassID(Classes.Port),
        new EPath.Segments.Logical.InstanceID(instanceID)
      ])
    );
  }
  

  static GetClassAttributeRequest(attribute) {
    return MessageRouter.Request(
      CommonServices.GetAttributeSingle,
      EPath.Encode(true, [
        new EPath.Segments.Logical.ClassID(Classes.Port),
        new EPath.Segments.Logical.InstanceID(0),
        new EPath.Segments.Logical.AttributeID(attribute)
      ]),
      // Encode(DataType.USINT, attribute)
    );
  }
}

Port.InstanceAttribute = InstanceAttributeCodes;


module.exports = Port;


Port.ClassAttribute = ClassAttributeCodes;