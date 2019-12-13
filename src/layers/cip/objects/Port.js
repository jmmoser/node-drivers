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
  [InstanceAttributeCodes.Link]: DataType.STRUCT([DataType.UINT, DataType.EPATH(true)]),
  [InstanceAttributeCodes.Name]: DataType.SHORT_STRING,
  [InstanceAttributeCodes.TypeName]: DataType.SHORT_STRING,
  [InstanceAttributeCodes.Description]: DataType.SHORT_STRING,
  [InstanceAttributeCodes.NodeAddress]: DataType.EPATH(true),
  [InstanceAttributeCodes.NodeRange]: DataType.STRUCT([DataType.UINT, DataType.UINT]),
  [InstanceAttributeCodes.Key]: DataType.EPATH(false)
}

/** CIP Vol 3 Chapter 3-7.3 */
const PortTypeDescriptions = {
  0: 'connection terminates in this device',
  1: 'reserved for compatibility with existing protocols',
  2: 'ControlNet',
  3: 'ControlNet redundant',
  4: 'EtherNet/IP',
  5: 'DeviceNet',
  200: 'CompoNet',
  201: 'Modbus/TCP',
  202: 'Modbus/SL',
  65535: 'unconfigured port'
};


class Port {
  // static InstanceAttributeCodes() {
  //   return InstanceAttributeCodes;
  // }

  static InstanceAttributeName(attribute) {
    return InstanceAttributeNames[attribute] || 'Unknown';
  }

  static InstanceTypeDescription(type) {
    return PortTypeDescriptions[type] || 'Unknown';
  }

  static DecodeInstanceAttribute(attribute, data, offset, cb) {
    if (attribute === InstanceAttributeCodes.NodeAddress) {
      /**
       * A device which does not have a node number on the port can indicate
       * a zero length node address within the Port Segment (0x10 0x00).
       */
      if (data.readUInt16LE(offset) === 1) {
        if (typeof cb === 'function') {
          cb(value);
        }
        return offset + 2;
      }
    }

    const dataType = InstanceAttributeDataTypes[attribute];
    if (!dataType) {
      throw new Error(`Unknown instance attribute: ${attribute}`);
    }

    let value;
    offset = Decode(dataType, data, offset, val => value = val);

    if (typeof cb === 'function') {
      cb(value);
    }
    return offset;
  }
}

Port.InstanceAttribute = InstanceAttributeCodes;


module.exports = Port;