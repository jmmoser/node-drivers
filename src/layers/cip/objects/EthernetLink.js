'use strict';

const CIPMetaObject = require('../core/object');
const CIPAttribute = require('../core/attribute');
const CIPFeatureGroup = require('../core/featuregroup');
const CIPRequest = require('../core/request');
const { ClassCodes, CommonServiceCodes } = require('../core/constants');
const EPath = require('../epath');
const { DataType } = require('../datatypes');


const CLASS_CODE = ClassCodes.EthernetLink;



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

const InstanceAttribute = {
  InterfaceSpeed: new CIPAttribute.Instance(1, 'Interface Speed', DataType.UDINT),
  /**
   * Bit 0 - Link Status
   *  Value 0: Inactive link
   *  Value 1: Active link
   * Bit 1 - Half/Full Duplex
   *  Value 0: Half duplex
   *  Value 1: Full duplex
   */
  InterfaceFlags: new CIPAttribute.Instance(2, 'Interface Flags', DataType.DWORD),
  PhysicalAddress: new CIPAttribute.Instance(3, 'Physical Address', DataType.ABBREV_ARRAY(DataType.SINT, 6)),
  InterfaceCounters: new CIPAttribute.Instance(4, 'Interface Counters', DataType.STRUCT([
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
  ])),
  MediaCounters: new CIPAttribute.Instance(5, 'Media Counters', DataType.STRUCT([
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
  ])),
  InterfaceControl: new CIPAttribute.Instance(6, 'Interface Control', DataType.STRUCT([
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
  ])),
  InterfacePortIndex: new CIPAttribute.Instance(100, 'Interface Port Index', DataType.UDINT),
  InterfacePortDescription: new CIPAttribute.Instance(101, 'Interface Port Description', DataType.STRING),
  /**
   * Value 0: Disabled Broadcast Storm Protection
   * Value 1: Enable Broadcast Storm Protection
   */
  BroadcastStormProtection: new CIPAttribute.Instance(102, 'Broadcast Storm Protection', DataType.USINT),

  InterfaceUtilization: new CIPAttribute.Instance(103, 'Interface Utilization', DataType.USINT),
  UtilizationAlarmUpperThreshold: new CIPAttribute.Instance(104, 'Utilization Alarm Upper Threshold', DataType.USINT),
  UtilizationAlarmLowerThreshold: new CIPAttribute.Instance(105, 'Utilization Alarm Lower Threshold', DataType.USINT),
  
  /**
   * Value 0: Ignore
   * Value 1: On (Relay 1)
   * Value 2: On (Relay 2)
   * Value 3: Off (Relay 1)
   * Value 4: Off (Relay 2)
   * */
  PortLinkAlarm: new CIPAttribute.Instance(106, 'Port Link Alarm', DataType.USINT),
  /**
   * Value 0: Disable
   * Value 1: Enable (Relay 1)
   * Value 2: Enable (Relay 2)
   */
  PortTrafficOverloadAlarm: new CIPAttribute.Instance(107, 'Port Traffic Overload Alarm', DataType.USINT)
};


const CIPObject = CIPMetaObject(
  CLASS_CODE,
  ClassAttributeGroup,
  InstanceAttributeGroup,
  null
);


class EthernetLink extends CIPObject {

}


module.exports = EthernetLink;