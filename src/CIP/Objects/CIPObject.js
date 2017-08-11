'use strict';

// class CIPInstance {
//   class() {
//     return this._class;
//   }
//
//   attributes() {
//     return this._attributes;
//   }
// }
//
// class CIPClass {
//   classId() {
//     return this._classId;
//   }
// }




// const Queueable = require('./../../Classes/Queueable');

// CIPObjects exist in the context of the CIPLayer
// class CIPObject extends Queueable {
class CIPObject {
  constructor(layer, options) {
    // super();
    this._options = options || {};
    layer.addObject(this);
  }

  close(callback) {
    //
  }
}

module.exports = CIPObject;

// const CIPGeneralUseObjects = {
//   Assembly: 0x04,
//   AcknowledgeHandler: 0x2B,
//   Connection: 0x05,
//   ConnectionConfiguration: 0xF3,
//   ConnectionManager: 0x06,
//   File: 0x37,
//   Identity: 0x01,
//   MessageRouter: 0x02,
//   OriginatorConnectionList: 0x45,
//   Parameter: 0x0F,
//   ParameterGroup: 0x10,
//   Port: 0xF4,
//   Register: 0x07,
//   Selection: 0x2E
// };

// const CIPNetworkSpecificObjects = {
//   BaseSwitch: 0x51,
//   CompoNetLink: 0xF7,
//   CompoNetRepeater: 0xF8,
//   ControlNet: 0xF0,
//   ControlNetKeeper: 0xF1,
//   ControlNetScheduling: 0xF2,
//   DeviceLevelRing: 0x47,
//   DeviceNet: 0x03,
//   EthernetLink: 0xF6,
//   Modbus: 0x44,
//   ModbusSerialLink: 0x46,
//   ParallelRedundancyProtocol: 0x56,
//   PowerManagement: 0x53,
//   PRPNodesTable: 0x57,
//   SERCOSIIILink: 0x4C,
//   SNMP: 0x52,
//   QoS: 0x48,
//   RSTPBridge: 0x54,
//   RSTPPort: 0x55,
//   TCPIPInterface: 0xF5
// };

// const CIPSegmentType = {
//   PortSegment: 0,
//   LogicalSegment: 1,
//   NetworkSegment: 2,
//   SymbolicSegment: 3,
//   DataSegment: 4,
//   DataTypeConstructed: 5,
//   DataTypeElementary: 6
// };
//
// const CIPLogicalSegmentType = {
//   ClassID: 0,
//   InstanceID: 1,
//   MemberID: 2,
//   ConnectionPoint: 3,
//   AttributeID: 4,
//   Special: 5, // Does not use the logical addressing definiation for the Logical Format
//   ServiceID: 6, // Does not use the logical addressing definiation for the Logical Format
//   Reserved: 7
// };
