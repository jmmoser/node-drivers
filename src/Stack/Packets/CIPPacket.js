// 'use strict';
//
// const nullBuffer = Buffer.alloc(0);
//
// class CIPPacket {
//   constructor() {
//     this.Service = '';
//     this.Path = Buffer.from([0x20, 0x67, 0x24, 0x01]);
//     this.Vendor = Buffer.from([0x07, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03]);
//     this.Data = nullBuffer;
//   }
//
//   toBuffer() {
//     let buffer = Buffer.alloc(1 + 1 + this.Path.length / 2 + this.Vendor.length);
//     let offset = 0;
//
//     buffer.writeUInt8(this.Service, offset); offset += 1;
//     buffer.writeUInt8(this.Path.length / 2, offset);
//     this.Path.copy(buffer, offset); offset += this.Path.length;
//     this.Data.copy(buffer, offset); offset += this.Data.length;
//     return buffer;
//   }
//
//   static fromBuffer(buffer) {
//     let packet = new CIPPacket();
//     let offset = 0;
//     packet.Service = buffer.readUInt16LE(offset); offset += 2;
//     offset += 1; // Reserved, shall be zero
//     packet.Status = buffer.readUInt8(offset); offset += 1;
//     let additionalStatusSize = 2 * buffer.readUInt8(offset); offset += 1;
//     if (additionalStatusSize > 0) {
//       packet.AdditionalStatus = buffer.slice(offset, offset + additionalStatusSize);
//       offset += additionalStatusSize;
//     }
//     packet.Data = buffer.slice(offset);
//     return packet;
//   }
// }
//
// module.exports = CIPPacket;



// EIP-CIP-V1 Appendix C-1.5
// Segment definition Hierarchy
// Class ID
// Class ID, Instance ID
// Class ID, Instance ID, Attribute ID
// Class ID, Instance ID, Attribute ID, Member ID

// Class ID, Connection Point
// Class ID, Connection Point, Member ID

// Class ID, Instance ID, Connection Point
// Class ID, Instance ID, Connection Point, Member ID

const CIPLogicalSegments = {
  0x06: 'Class',
  0x24: 'Instance'
};

// Table 5.1 in EIP-CIP-V1
const CIPClass = {
  Identity: 0x01,
  MessageRouter: 0x02,
  DeviceNet: 0x03,
  Assembly: 0x04,
  Connection: 0x05,
  ConnectionManager: 0x06,
  Register: 0x07,
  DiscreteInputPoint: 0x08,
  DiscreteOutputPoint: 0x09,
  AnalogInputPoint: 0x0A,
  AnalogOuputPoint: 0x0B,
  PresenceSensing: 0x0E,
  Parameter: 0x0F,
  ParameterGroup: 0x10,
  Group: 0x12,
  DiscreteInputGroup: 0x1D,
  DiscreteOutputGroup: 0x1E,
  DiscreteGroup: 0x1F,
  AnalogInputGroup: 0x20,
  AnalogOutputGroup: 0x21,
  AnalogGroup: 0x22,
  PositionSensorObject: 0x23,
  PositionControllerSupervisorObject: 0x24,
  PositionControllerObject: 0x25,
  BlockSequencerObject: 0x26,
  CommandBlockObject: 0x27,
  MotorDataObject: 0x28,
  ControlSupervisorObject: 0x29,
  ACDCDriveObject: 0x2A,
  AcknowledgeHandlerObject: 0x2B,
  OverloadObject: 0x2C,
  SoftstartObject: 0x2D,
  SelectionObject: 0x2E,
  SDeviceSupervisorObject: 0x30,
  SAnalogSensorObject: 0x31,
  SAnalogActuatorObject: 0x32,
  SSingleStageControllerObject: 0x33,
  SGasCalibrationObject: 0x34,
  TripPointObject: 0x35,
  PCCCObject: 0x67,
  SCANportPassThroughParameter: 0x93,
  SCANportPassThroughFaultQueue: 0x97,
  SCANportPassThroughWarningQueue: 0x98,
  SCANportPassThroughLink: 0x99,
  NonVolatileStorage: 0xA1,
  ControlNetObject: 0xF0,
  ControlNetKeeperObject: 0xF1,
  ControlNetSchedulingObject: 0xF2,
  ConnectionConfigurationObject: 0xF3,
  PortObject: 0xF4,
  TCPIPInterfaceObject: 0xF5,
  EtherNetLinkObject: 0xF6
};

// EIP-CIP-V1 Appendix A
const CIPCommonServices = {
  GetAttributeAll: 0x01,
  SetAttributeAll: 0x02,
  GetAttributeList: 0x03,
  SetAttributeList: 0x04,
  Reset: 0x05,
  Start: 0x06,
  Stop: 0x07,
  Create: 0x08,
  Delete: 0x09,
  MultipleServicesPacket: 0x0A,
  ApplyAttributes: 0x0D,
  GetAttributeSingle: 0x0E,
  SetAttributeSingle: 0x10,
  FindNextObjectInstance: 0x11,
  ErrorResponse: 0x14, // used by DeviceNet only
  Restore: 0x15,
  Save: 0x16,
  NOP: 0x17,
  GetMember: 0x18,
  SetMember: 0x19,
  InsertMember: 0x1A,
  RemoveMember: 0x1B,

  // ReadTag: 0x4C,
  // WriteTag: 0x4D,
  // ForwardClose: 0x4E, // is this correct?
};
