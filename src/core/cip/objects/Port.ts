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

import CIPMetaObject from '../object';
import CIPAttribute from '../attribute';
import { ClassCodes } from '../constants/index';
import { DataType, PlaceholderDataType } from '../datatypes/index';

/** CIP Vol 3 Chapter 3-7.3 */
const PortTypeNames: { [key: number]: string } = Object.freeze({
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
  65535: 'Unconfigured port',
});

const ClassAttribute = Object.freeze({
  EntryPort: new CIPAttribute(ClassCodes.Port, 8, 'Entry Port', DataType.UINT),
  InstanceInfo: new CIPAttribute(ClassCodes.Port, 9, 'Instance Info', DataType.ABBREV_ARRAY(
    DataType.TRANSFORM(
      DataType.STRUCT([
        DataType.UINT, // Type
        DataType.UINT, // Number
      ]),
      (value) => ({
        type: {
          code: value[0],
          name: PortTypeNames[value[0]] || 'Unknown',
        },
        number: value[1],
      }),
    ),
    true,
  )),
});

const InstanceAttribute = Object.freeze({
  Type: new CIPAttribute(ClassCodes.Port, 1, 'Type', DataType.TRANSFORM(
    DataType.UINT,
    (value) => ({
      code: value,
      name: PortTypeNames[value] || 'Unknown',
    }),
  )),
  Number: new CIPAttribute(ClassCodes.Port, 2, 'Number', DataType.UINT),
  Link: new CIPAttribute(ClassCodes.Port, 3, 'Link', DataType.TRANSFORM(
    DataType.STRUCT(
      [
        DataType.UINT,
        DataType.PLACEHOLDER((length) => DataType.EPATH({ padded: true, length })),
      ],
      (members, dt) => {
        if (members.length === 1) {
          return (dt as PlaceholderDataType).resolve(2 * (members[0] as number));
        }
        return undefined;
      },
    ),
    (value: any[]) => value[1],
  )),
  Name: new CIPAttribute(ClassCodes.Port, 4, 'Name', DataType.SHORT_STRING),
  TypeName: new CIPAttribute(ClassCodes.Port, 5, 'Type Name', DataType.SHORT_STRING),
  Description: new CIPAttribute(ClassCodes.Port, 6, 'Description', DataType.SHORT_STRING),
  NodeAddress: new CIPAttribute(ClassCodes.Port, 7, 'Node Address', DataType.EPATH({ padded: true, length: false })),
  NodeRange: new CIPAttribute(ClassCodes.Port, 8, 'Node Range', DataType.STRUCT([
    DataType.UINT,
    DataType.UINT,
  ])),
  Key: new CIPAttribute(ClassCodes.Port, 9, 'Key', DataType.EPATH({ padded: false, length: false })),
});

const CIPObject = CIPMetaObject(ClassCodes.Port, {
  ClassAttributes: ClassAttribute,
  InstanceAttributes: InstanceAttribute,
  GetAllInstanceAttributes: Object.freeze([
    InstanceAttribute.Type,
    InstanceAttribute.Number,
    InstanceAttribute.Link,
    InstanceAttribute.Name,
    InstanceAttribute.NodeAddress,
  ])
});

export default class Port extends CIPObject {
  static ClassAttribute = ClassAttribute;
  static InstanceAttribute = InstanceAttribute;
}
