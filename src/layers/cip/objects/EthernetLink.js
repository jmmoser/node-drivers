'use strict';

const EPath = require('../epath');
const { ClassCodes, CommonServiceCodes } = require('../core/constants');
const { DataType } = require('../datatypes');
const CIPRequest = require('../core/request');


const InstanceAttributeCodes = {
  InterfaceSpeed: 1,
  InterfaceFlags: 2,
  PhysicalAddress: 3,
  InterfaceCounters: 4,
  MediaCounters: 5,
  InterfaceControl: 6,
  InterfacePortIndex: 100,
  InterfacePortDescription: 101,
  BroadcastStormProtection: 102,
  InterfaceUtilization: 103,
  UtilizationAlarmUpperThreshold: 104,
  UtilizationAlarmLowerThreshold: 105,
  PortLinkAlarm: 106,
  PortTrafficOverloadAlarm: 107
};

const InstanceAttributeDataTypes = {
  [InstanceAttributeCodes.InterfaceSpeed]: DataType.UDINT,
  /**
   * Bit 0 - Link Status
   *  Value 0: Inactive link
   *  Value 1: Active link
   * Bit 1 - Half/Full Duplex
   *  Value 0: Half duplex
   *  Value 1: Full duplex
   */
  [InstanceAttributeCodes.InterfaceFlags]: DataType.DWORD,
  [InstanceAttributeCodes.PhysicalAddress]: DataType.ARRAY(DataType.SINT, 0, 6),
  [InstanceAttributeCodes.InterfaceCounters]: DataType.STRUCT([
    DataType.UDINT, /** Inbound Octets */
    DataType.UDINT, /** Inbound Unicast Packets */
    DataType.UDINT, /** Inbound Non-Unicast Packets */
    DataType.UDINT, /** Inbound Discarded Packets */
    DataType.UDINT, /** Inbound Error Packets */
    DataType.UDINT, /** Inbound Unknown Protocol Packets */
    DataType.UDINT, /** Outbound Octets */
    DataType.UDINT, /** Outbound Unicast Packets */
    DataType.UDINT, /** Outbound Non-Unicast Packets */
    DataType.UDINT, /** Outbound Discarded Packets */
    DataType.UDINT /** Outbound Error Packets */
  ]),
  [InstanceAttributeCodes.MediaCounters]: DataType.STRUCT([
    DataType.UDINT, /** Alignment Errors, Received frames that are not an integral number of octets in length */
    DataType.UDINT, /** FCS Errors */
    DataType.UDINT, /** Single Collisions */
    DataType.UDINT, /** Multiple Collisions */
    DataType.UDINT, /** SQE Test Errors */
    DataType.UDINT, /** Deferred Transmissions */
    DataType.UDINT, /** Late Collisions */
    DataType.UDINT, /** Excessive Collisions */
    DataType.UDINT, /** MAC Transmit Errors */
    DataType.UDINT, /** Carrier Sense Errors */
    DataType.UDINT, /** Frame Too Long */
    DataType.UDINT /** MAC Receive Errors */
  ]),
  [InstanceAttributeCodes.InterfaceControl]: DataType.STRUCT([
    /** 
     * Control Bits
     * Bit 0: Auto-Negotiate
     *  0: Force
     *  1: Auto-Negotiate
     * Bit 1: Half/Full Duplex
     *  0: half duplex
     *  1: full duplex
     * Bit 2 to 15: Reserved, all zero
     */
    DataType.WORD,
    /** 
     * Forced Interface Speed
     * Speed at which the interface shall be forced to operate
     * */
    DataType.UINT
  ]),
  [InstanceAttributeCodes.InterfacePortIndex]: DataType.UDINT,
  [InstanceAttributeCodes.InterfacePortDescription]: DataType.STRING,
  /**
   * Value 0: Disabled Broadcast Storm Protection
   * Value 1: Enable Broadcast Storm Protection
   */
  [InstanceAttributeCodes.BroadcastStormProtection]: DataType.USINT,
  [InstanceAttributeCodes.InterfaceUtilization]: DataType.USINT,
  [InstanceAttributeCodes.UtilizationAlarmUpperThreshold]: DataType.USINT,
  [InstanceAttributeCodes.UtilizationAlarmLowerThreshold]: DataType.USINT,
  /**
   * Value 0: Ignore
   * Value 1: On (Relay 1)
   * Value 2: On (Relay 2)
   * Value 3: Off (Relay 1)
   * Value 4: Off (Relay 2)
   * */
  [InstanceAttributeCodes.PortLinkAlarm]: DataType.USINT,
  /**
   * Value 0: Disable
   * Value 1: Enable (Relay 1)
   * Value 2: Enable (Relay 2)
   */
  [InstanceAttributeCodes.PortTrafficOverloadAlarm]: DataType.USINT
};


class EthernetLink {
  static DecodeInstanceAttribute(attribute, data, offset, cb) {
    const dataType = InstanceAttributeDataTypes[attribute];
    if (!dataType) {
      throw new Error(`Unknown instance attribute: ${attribute}`);
    }

    let value;
    offset = Decode(dataType, data, offset, val => value = val);

    // switch (attribute) {
    //   case InstanceAttributeCodes.Type: {
    //     value = {
    //       code: value,
    //       name: PortTypeNames[value] || 'Unknown'
    //     };
    //     break;
    //   }
    //   default:
    //     break;
    // }

    if (typeof cb === 'function') {
      cb({
        code: attribute,
        name: InstanceAttributeNames[attribute] || 'Unknown',
        value
      });
    }
    return offset;
  }

  static GetClassAttribute(attribute) {
    return new CIPRequest(
      CommonServiceCodes.GetAttributeSingle,
      EPath.Encode(true, [
        new EPath.Segments.Logical.ClassID(ClassCodes.EthernetLink),
        new EPath.Segments.Logical.InstanceID(0),
        new EPath.Segments.Logical.AttributeID(attribute)
      ]),
      null,
      // (buffer, offset, cb) => {
      //   this.DecodeInstanceAttribute(buffer, offset, attribute, cb);
      // }
    );
  }

  static GetInstanceAttribute(instance, attribute) {
    return new CIPRequest(
      CommonServiceCodes.GetAttributeSingle,
      EPath.Encode(true, [
        new EPath.Segments.Logical.ClassID(ClassCodes.EthernetLink),
        new EPath.Segments.Logical.InstanceID(instance),
        new EPath.Segments.Logical.AttributeID(attribute)
      ]),
      null,
      // (buffer, offset, cb) => {
      //   this.DecodeInstanceAttribute(buffer, offset, attribute, cb);
      // }
    );
  }
}


module.exports = EthernetLink;