import {
  InvertKeyValues,
} from '../../../utils';

import { CodeDescriptionMap } from '../../../types';

/**
 * References:
 *  - CIP Vol 1 Table 5.1
 *  - https://github.com/boundary/wireshark/blob/07eade8124fd1d5386161591b52e177ee6ea849f/epan/dissectors/packet-cip.c#L2448
 */
export const ClassCodes = Object.freeze({
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
  PositionSensor: 0x23,
  PositionControllerSupervisor: 0x24,
  PositionController: 0x25,
  BlockSequencer: 0x26,
  CommandBlock: 0x27,
  MotorData: 0x28,
  ControlSupervisor: 0x29,
  ACDCDrive: 0x2A,
  AcknowledgeHandler: 0x2B,
  Overload: 0x2C,
  Softstart: 0x2D,
  Selection: 0x2E,
  SDeviceSupervisor: 0x30,
  SAnalogSensor: 0x31,
  SAnalogActuator: 0x32,
  SSingleStageController: 0x33,
  SGasCalibration: 0x34,
  TripPoint: 0x35,
  File: 0x37,
  SPartialPressure: 0x38,
  SafetySupervisor: 0x39,
  SafetyValidator: 0x3A,
  SafetyDiscreteOutputPoint: 0x3B,
  SafetyDiscreteOutputGroup: 0x3C,
  SafetyDiscreteInputPoint: 0x3D,
  SafetyDiscreteInputGroup: 0x3E,
  SafetyDualChannelOutput: 0x3F,
  SSensorCalibration: 0x40,
  EventLog: 0x41,
  MotionAxis: 0x42,
  TimeSync: 0x43,
  Modbus: 0x44,
  OriginatorConnectionList: 0x45,
  ModbusSerialLink: 0x46,
  DeviceLevelRing: 0x47,
  QoS: 0x48,
  SafetyAnalogInputPoint: 0x49,
  SafetyAnalogInputGroup: 0x4A,
  SafetyDualChannelAnalogInput: 0x4B,
  SERCOSIIILink: 0x4C,
  TargetConnectionList: 0x4D,
  BaseEnergy: 0x4E,
  ElectricalEnergy: 0x4F,
  NonElectricalEnergy: 0x50,
  BaseSwitch: 0x51,
  SNMP: 0x52,
  PowerManagement: 0x53,
  RSTPBridge: 0x54,
  RSTPPort: 0x55,
  PRPHSRProtocol: 0x56,
  PRPHSRNodesTable: 0x57,
  SafetyFeedback: 0x58,
  SafetyDualChannelFeedback: 0x59,
  SafetyStopFunctions: 0x5A,
  SafetyLimitFunctions: 0x5B,
  PowerCurtailment: 0x5C,
  CIPSecurity: 0x5D,
  EthernetIPSecurity: 0x5E,
  CertificateManagement: 0x5F,
  PCCC: 0x67,
  SCANportPassThroughParameter: 0x93,
  SCANportPassThroughFaultQueue: 0x97,
  SCANportPassThroughWarningQueue: 0x98,
  SCANportPassThroughLink: 0x99,
  NonVolatileStorage: 0xA1,
  ControlNet: 0xF0,
  ControlNetKeeper: 0xF1,
  ControlNetScheduling: 0xF2,
  ConnectionConfiguration: 0xF3,
  Port: 0xF4,
  TCPIPInterface: 0xF5,
  EthernetLink: 0xF6,
  CompoNetLink: 0xF7,
  CompoNetRepeater: 0xF8,
});

export const ClassNames = InvertKeyValues(ClassCodes) as CodeDescriptionMap;
