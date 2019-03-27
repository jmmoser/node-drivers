'use strict';

// EIP-CIP-V1 Table 5.1
const Classes = {
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

// CIP Vol1 Appendix A
const Services = {
  GetAttributesAll: 0x01,
  SetAttributesAll: 0x02,
  GetAttributeList: 0x03,
  SetAttributeList: 0x04,
  Reset: 0x05,
  Start: 0x06,
  Stop: 0x07,
  Create: 0x08,
  Delete: 0x09,
  MultipleServicePacket: 0x0A,
  ApplyAttributes: 0x0D,
  GetAttributeSingle: 0x0E,
  SetAttributeSingle: 0x10,
  FindNextObjectInstance: 0x11,
  Restore: 0x15,
  Save: 0x16,
  NoOperation: 0x17,
  GetMember: 0x18,
  SetMember: 0x19,
  InsertMember: 0x1A,
  RemoveMember: 0x1B,
  GroupSync: 0x1C
};

// CIP Vol1 Table 4-4.2
const ReservedClassAttributes = {
  Revision: 1,
  MaxInstance: 2,
  NumberOfInstances: 3,
  OptionalAttributeList: 4,
  OptionalServiceList: 5,
  MaximumIDNumberClassAttributes: 6,
  MaximumIDNumberInstanceAttributes: 7
};

module.exports = {
  Classes,
  Services,
  ReservedClassAttributes
};
