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
const { ClassCodes } = require('../core/constants');
const { DataType } = require('../datatypes');



/** CIP Vol 3 Chapter 3-7.3 */
const PortTypeNames = Object.freeze({
  0: 'Connection terminates in this device',
  // 1: 'Reserved for compatibility with existing protocols (Backplane)',
  1: 'Backplane',
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
  EntryPort: new CIPAttribute.Class(8, 'Entry Port', DataType.UINT),
  InstanceInfo: new CIPAttribute.Class(9, 'Instance Info', DataType.ABBREV_ARRAY(
    DataType.TRANSFORM(
      DataType.STRUCT([
        DataType.UINT, // Type
        DataType.UINT  // Number
      ]),
      value => ({
        type: {
          code: value[0],
          name: PortTypeNames[value[0]]
        },
        number: value[1]
      })
    ),
    // DataType.STRUCT([
    //   DataType.UINT, // Type
    //   DataType.UINT  // Number
    // ]),
    true
  ))
});


const InstanceAttribute = Object.freeze({
  Type: new CIPAttribute.Instance(1, 'Type', DataType.TRANSFORM(
    DataType.UINT,
    function(value) {
      console.log('VALUE', value);
      return {
        code: value,
        name: PortTypeNames[value] || 'Unknown'
      }
    }
  )),
  Number: new CIPAttribute.Instance(2, 'Number', DataType.UINT),
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


const GetAttributesAllInstanceAttributes = Object.freeze([
  InstanceAttribute.Type,
  InstanceAttribute.Number,
  InstanceAttribute.Link,
  InstanceAttribute.Name,
  InstanceAttribute.NodeAddress
]);


const CIPObject = CIPMetaObject(ClassCodes.Port, {
  ClassAttributeGroup,
  InstanceAttributeGroup,
  GetAttributesAllInstanceAttributes
});

class Port extends CIPObject {}

Port.ClassAttribute = ClassAttribute;
Port.InstanceAttribute = InstanceAttribute;

module.exports = Port;