'use strict';

const CIPMetaObject = require('../core/object');
const CIPAttribute = require('../core/attribute');
const CIPFeatureGroup = require('../core/featuregroup');
const { ClassCodes } = require('../core/constants');
const { DataType } = require('../datatypes');
const { getBits } = require('../../../utils');

const ClassAttribute = Object.freeze({});

const InstanceAttribute = Object.freeze({
  InterfaceSpeed: new CIPAttribute.Instance(1, 'Interface Speed', DataType.TRANSFORM(
    DataType.UDINT,
    function (value) {
      return `${value} Mbps`;
    }
  )),
  /**
   * Bit 0 - Link Status
   *  Value 0: Inactive link
   *  Value 1: Active link
   * Bit 1 - Half/Full Duplex
   *  Value 0: Half duplex
   *  Value 1: Full duplex
   */
  // InterfaceFlags: new CIPAttribute.Instance(2, 'Interface Flags', DataType.DWORD),
  InterfaceFlags: new CIPAttribute.Instance(2, 'Interface Flags', DataType.TRANSFORM(
    DataType.DWORD,
    function(value) {
      const linkStatusCode = getBits(value, 0, 1);
      const duplexCode = getBits(value, 1, 2);
      const negotiationStatusCode = getBits(value, 2, 5);
      const manualSettingRequiresResetCode = getBits(value, 5, 6);
      const localHardwareFaultCode = getBits(value, 6, 7);
      return {
        linkStatus: linkStatusCode === 0 ? 'inactive' : 'active',
        duplex: duplexCode === 0 ? 'half' : 'full',
        negotiationStatus: ({
          0: 'Auto-negotaion in progress',
          1: 'Auto-negotiation and speed detection failed. Using default values for speed and duplex.',
          2: 'Auto-negotiation failed but detected speed. Duplex was defaulted (default is half duplex).',
          3: 'Successfully negotiated speed and duplex',
          4: 'Auto-negotiation not attempted. Forced speed and duplex.'
        })[negotiationStatusCode] || 'Unknown',
        manualSettingRequiresReset: manualSettingRequiresResetCode === 1,
        localHardwareFault: localHardwareFaultCode === 1
      };
    }
  )),
  PhysicalAddress: new CIPAttribute.Instance(3, 'Physical Address', DataType.TRANSFORM(
    DataType.ABBREV_ARRAY(DataType.USINT, 6),
    function(value) {
      return value.map(v => v.toString(16).padStart(2, '0')).join(':');
    }
  )),
  InterfaceCounters: new CIPAttribute.Instance(4, 'Interface Counters', DataType.TRANSFORM(
    DataType.STRUCT([
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
    (value) => ({
      inboundOctets: value[0],
      inboundUnicastPackets: value[1],
      inboundNonUnicastPackets: value[2],
      inboundDiscardedPackets: value[3],
      inboundErrorPackets: value[4],
      inboundUnknownProtocolPackets: value[5],
      outboundOctets: value[6],
      outboundUnicastPackets: value[7],
      outboundNonUnicastPackets: value[8],
      outboundDiscardedPackets: value[9],
      outboundErrorPackets: value[10]
    })
  )),
  MediaCounters: new CIPAttribute.Instance(5, 'Media Counters', DataType.TRANSFORM(
    DataType.STRUCT([
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
    (value) => ({
      alignmentErrors: value[0],
      fcsErrors: value[1],
      singleCollisions: value[2],
      multipleCollisions: value[3],
      sqeTestErrors: value[4],
      deferredTransmissions: value[5],
      lateCollisions: value[6],
      excessiveCollisions: value[7],
      macTransmitErrors: value[8],
      carrierSenseErrors: value[9],
      frameTooLong: value[10],
      macReceiveErrors: value[11]
    })
  )),
  InterfaceControl: new CIPAttribute.Instance(6, 'Interface Control', DataType.TRANSFORM(
    DataType.STRUCT([
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
    function (value) {
      const autoNegotiationEnabled = getBits(value[0], 0, 1) === 1;
      return {
        autoNegotiationEnabled,
        forcedDuplexMode: !autoNegotiationEnabled ? (getBits(value[0], 1, 2) ? 'half' : 'full') : null,
        forcedInterfaceSpeed: !autoNegotiationEnabled ? `${value[1]} Mbps` : null
      };
    }
  )),
  InterfaceLabel: new CIPAttribute.Instance(10, 'Interface Label', DataType.SHORT_STRING),
  // InterfacePortIndex: new CIPAttribute.Instance(100, 'Interface Port Index', DataType.UDINT),
  // InterfacePortDescription: new CIPAttribute.Instance(101, 'Interface Port Description', DataType.STRING),
  // /**
  //  * Value 0: Disabled Broadcast Storm Protection
  //  * Value 1: Enable Broadcast Storm Protection
  //  */
  // BroadcastStormProtection: new CIPAttribute.Instance(102, 'Broadcast Storm Protection', DataType.USINT),

  // InterfaceUtilization: new CIPAttribute.Instance(103, 'Interface Utilization', DataType.USINT),
  // UtilizationAlarmUpperThreshold: new CIPAttribute.Instance(104, 'Utilization Alarm Upper Threshold', DataType.USINT),
  // UtilizationAlarmLowerThreshold: new CIPAttribute.Instance(105, 'Utilization Alarm Lower Threshold', DataType.USINT),
  
  // /**
  //  * Value 0: Ignore
  //  * Value 1: On (Relay 1)
  //  * Value 2: On (Relay 2)
  //  * Value 3: Off (Relay 1)
  //  * Value 4: Off (Relay 2)
  //  * */
  // PortLinkAlarm: new CIPAttribute.Instance(106, 'Port Link Alarm', DataType.USINT),
  // /**
  //  * Value 0: Disable
  //  * Value 1: Enable (Relay 1)
  //  * Value 2: Enable (Relay 2)
  //  */
  // PortTrafficOverloadAlarm: new CIPAttribute.Instance(107, 'Port Traffic Overload Alarm', DataType.USINT)
});

const ClassAttributeGroup = new CIPFeatureGroup(Object.values(ClassAttribute));
const InstanceAttributeGroup = new CIPFeatureGroup(Object.values(InstanceAttribute));


const GetAttributesAllInstanceAttributes = Object.freeze([
  InstanceAttribute.InterfaceSpeed,
  InstanceAttribute.InterfaceFlags,
  InstanceAttribute.PhysicalAddress,
  InstanceAttribute.InterfaceCounters,
  InstanceAttribute.MediaCounters,
  InstanceAttribute.InterfaceControl
]);


const CIPObject = CIPMetaObject(ClassCodes.EthernetLink, {
  ClassAttributeGroup,
  InstanceAttributeGroup,
  GetAttributesAllInstanceAttributes
});

class EthernetLink extends CIPObject {}

EthernetLink.ClassAttribute = ClassAttribute;
EthernetLink.InstanceAttribute = InstanceAttribute;

module.exports = EthernetLink;