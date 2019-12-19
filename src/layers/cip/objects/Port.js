const {
  InvertKeyValues
} = require('../../../utils');

const {
  DataType,
  Decode
} = require('./CIP');


const InstanceAttributeCodes = {
  Type: 1,
  Number: 2,
  Link: 3,
  Name: 4,
  TypeName: 5,
  Description: 6,
  NodeAddress: 7,
  NodeRange: 8,
  Key: 9
};

const InstanceAttributeNames = InvertKeyValues(InstanceAttributeCodes);

const InstanceAttributeDataTypes = {
  [InstanceAttributeCodes.Type]: DataType.UINT,
  [InstanceAttributeCodes.Number]: DataType.UINT,
  [InstanceAttributeCodes.Link]: DataType.STRUCT([DataType.SMEMBER(DataType.UINT, true), DataType.EPATH(true)], function (dataType, members, idx) {
    if (idx === 1) {
      // console.log(members);
      // console.log(`Setting epath length: ${2 * members[0]}`);
      // dataType.length = 2 * members[0];
      return DataType.EPATH(true, 2 * members[0]);
    }
  }),
  [InstanceAttributeCodes.Name]: DataType.SHORT_STRING,
  [InstanceAttributeCodes.TypeName]: DataType.SHORT_STRING,
  [InstanceAttributeCodes.Description]: DataType.SHORT_STRING,
  [InstanceAttributeCodes.NodeAddress]: DataType.EPATH(true),
  [InstanceAttributeCodes.NodeRange]: DataType.STRUCT([DataType.UINT, DataType.UINT]),
  [InstanceAttributeCodes.Key]: DataType.EPATH(false)
};

/** CIP Vol 3 Chapter 3-7.3 */
const PortTypeDescriptions = {
  0: 'Connection terminates in this device',
  1: 'Reserved for compatibility with existing protocols',
  2: 'ControlNet',
  3: 'ControlNet redundant',
  4: 'EtherNet/IP',
  5: 'DeviceNet',
  200: 'CompoNet',
  201: 'Modbus/TCP',
  202: 'Modbus/SL',
  65535: 'Unconfigured port'
};


class Port {
  static InstanceAttributeName(attribute) {
    return InstanceAttributeNames[attribute] || 'Unknown';
  }

  static InstanceTypeDescription(type) {
    /** type can be a number or the value from DecodeInstanceAttribute */
    type = type != null ? type.code || type : -1;
    return PortTypeDescriptions[type] || 'Unknown';
  }

  static DecodeInstanceAttribute(attribute, data, offset, cb) {
    const dataType = InstanceAttributeDataTypes[attribute];
    if (!dataType) {
      throw new Error(`Unknown instance attribute: ${attribute}`);
    }

    let value;
    offset = Decode(dataType, data, offset, val => value = val);
    const raw = value;

    if (typeof cb === 'function') {
      cb({
        code: attribute,
        name: InstanceAttributeNames[attribute] || 'Unknown',
        value,
        raw
      });
    }
    return offset;
  }
}

Port.InstanceAttribute = InstanceAttributeCodes;


module.exports = Port;