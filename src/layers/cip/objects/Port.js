'use strict';

const {
  InvertKeyValues
} = require('../../../utils');

const { DataType, Decode } = require('../datatypes');
// const {
//   DataType,
//   Decode
// } = require('./CIP');


const ClassAttributeCodes = Object.freeze({
  // 1
  InstanceInfo: 9
});

const ClassAttributeDataTypes = Object.freeze({
  [ClassAttributeCodes.InstanceInfo]: DataType.ABBREV_ARRAY(
    DataType.STRUCT([
      DataType.UINT, // Port Type
      DataType.UINT // Port Number
    ])
  )
});


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


class Port {
  static DecodeAttribute(forClass, attribute, attributes, data, offset, cb) {
    const 
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
}

Port.InstanceAttribute = InstanceAttributeCodes;


module.exports = Port;