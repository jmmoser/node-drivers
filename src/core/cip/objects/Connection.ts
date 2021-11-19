import { InvertKeyValues } from '../../../utils';
import { DataType, PlaceholderDataType } from '../datatypes/types';

// /** CIP Vol1 Table 3-4.2 */
// const ClassServices = Object.freeze({
//   /** Common */
//   Create: CommonServiceCodes.Create,
//   Delete: CommonServiceCodes.Delete,
//   Reset: CommonServiceCodes.Reset,
//   FindNextObjectInstance: CommonServiceCodes.FindNextObjectInstance,
//   GetAttributeSingle: CommonServiceCodes.GetAttributeSingle,
//   /** Class Specific */
//   ConnectionBind: 0x4B,
//   ProducingApplicationLookup: 0x4C,
//   SafetyClose: 0x4E,
//   SafetyOpen: 0x54
// });

// CIP Vol 1, Table 3-4.9 (p 3-13)
const InstanceAttributeCodes = Object.freeze({
  State: 1,
  Type: 2,
  TransportClassTrigger: 3,
  DeviceNetProducedConnectionID: 4,
  DeviceNetConsumedConnectionID: 5,
  DeviceNetInitialCommCharacteristics: 6,
  ProducedConnectionSize: 7,
  ConsumedConnectionSize: 8,
  ExpectedPacketRate: 9,
  CIPProducedConnectionID: 10,
  CIPConsumedConnectionID: 11,
  WatchdogTimeoutAction: 12,
  ProducedConnectionPathLength: 13,
  ProducedConnectionPath: 14,
  ConsumedConnectionPathLength: 15,
  ConsumedConnectionPath: 16,
  ProductionInhibitTime: 17,
  ConnectionTimeoutMultiplier: 18,
  ConnectionBindingList: 19,
});

export const InstanceAttributeNames = InvertKeyValues(InstanceAttributeCodes);

export const InstanceAttributeDataTypes = Object.freeze({
  [InstanceAttributeCodes.State]: DataType.USINT,
  [InstanceAttributeCodes.Type]: DataType.USINT,
  [InstanceAttributeCodes.TransportClassTrigger]: DataType.BYTE,
  [InstanceAttributeCodes.DeviceNetProducedConnectionID]: DataType.UINT,
  [InstanceAttributeCodes.DeviceNetConsumedConnectionID]: DataType.UINT,
  [InstanceAttributeCodes.DeviceNetInitialCommCharacteristics]: DataType.BYTE,
  [InstanceAttributeCodes.ProducedConnectionSize]: DataType.UINT,
  [InstanceAttributeCodes.ConsumedConnectionSize]: DataType.UINT,
  [InstanceAttributeCodes.ExpectedPacketRate]: DataType.UINT,
  [InstanceAttributeCodes.CIPProducedConnectionID]: DataType.UDINT,
  [InstanceAttributeCodes.CIPConsumedConnectionID]: DataType.UDINT,
  [InstanceAttributeCodes.WatchdogTimeoutAction]: DataType.USINT,
  [InstanceAttributeCodes.ProducedConnectionPathLength]: DataType.UINT,
  [InstanceAttributeCodes.ProducedConnectionPath]: DataType.EPATH({ padded: false, length: false }),
  [InstanceAttributeCodes.ConsumedConnectionPathLength]: DataType.UINT,
  [InstanceAttributeCodes.ConsumedConnectionPath]: DataType.EPATH({ padded: false, length: false }),
  [InstanceAttributeCodes.ProductionInhibitTime]: DataType.UINT,
  [InstanceAttributeCodes.ConnectionTimeoutMultiplier]: DataType.USINT,
  [InstanceAttributeCodes.ConnectionBindingList]: DataType.TRANSFORM(
    DataType.STRUCT([
      DataType.UINT,
      DataType.PLACEHOLDER((length: number) => DataType.ABBREV_ARRAY(DataType.UINT, length)),
    ], (members, dt) => {
      if (members.length === 1) {
        return (dt as PlaceholderDataType).resolve(members[0]);
      }
      return undefined;
    }),
    (val: any[]) => val[1],
  ),
});

// CIP Vol1 Table 3-4.10
export const InstanceStateNames = Object.freeze({
  0: 'Non-existent',
  1: 'Configuring',
  2: 'Waiting for connection ID',
  3: 'Established',
  4: 'Timed out',
  5: 'Deferred delete',
  6: 'Closing',
});

// CIP Vol1 Table 3-4.11
export const InstanceTypeNames = Object.freeze({
  0: 'Explicit Messaging',
  1: 'I/O',
  2: 'CIP Bridged',
});

// CIP Vol1 Table 3-4.5
export const ConnectionBindServiceStatusCodeDescriptions = Object.freeze({
  0x02: {
    0x01: 'One or both of the connection instances is Non-existent',
    0x02: 'The connection class and/or instance is out of resources to bind instances',
  },
  0x0C: {
    0x01: 'Both of the connection instances are existent, but at least one is not in the established state',
  },
  0x20: {
    0x01: 'Both connection instances are the same value',
  },
  0xD0: {
    0x01: 'One or both of the connection instances is not a dynamically created I/O connection',
    0x02: 'One or both of the connection instances were created internally and the device is not allowing a binding to it',
  },
});

export const TypeCodes = Object.freeze({
  Null: 0,
  Multicast: 1,
  PointToPoint: 2,
});

export const PriorityCodes = Object.freeze({
  Low: 0,
  High: 1,
  Scheduled: 2,
  Urgent: 3,
});

export const SizeTypeCodes = Object.freeze({
  Fixed: 0,
  Variable: 1,
});

/** For Transport Class Trigger Attribute */
export const TransportClassCodes = Object.freeze({
  Class0: 0,
  Class1: 1,
  Class2: 2,
  Class3: 3,
});

export const TransportProductionTriggerCodes = Object.freeze({
  Cyclic: 0,
  ChangeOfState: 1,
  ApplicationObject: 2,
});

export const TransportDirectionCodes = Object.freeze({
  Client: 0,
  Server: 1,
});

export interface ConnectionTransportClassTrigger {
  direction?: boolean;
  productionTrigger?: number;
  transportClass?: number;
}

function buildTransportClassTriggerCode(transport: ConnectionTransportClassTrigger) {
  if (!TransportClassCodesSet.has(transport.transportClass)) {
    throw new Error(`CIP Connection invalid transport class ${transport.transportClass}`);
  }
  if (!TransportProductionTriggerCodesSet.has(transport.productionTrigger)) {
    throw new Error(`CIP Connection invalid transport production trigger ${transport.productionTrigger}`);
  }
  if (!TransportDirectionCodesSet.has(transport.direction)) {
    throw new Error(`CIP Connection invalid transport direction ${transport.direction}`);
  }

  return (
    ((transport.direction ? 0 : 1 & 0b1) << 7)
    | ((transport.productionTrigger! & 0b111) << 4)
    | ((transport.transportClass! & 0b1111))
  );
}

interface NetworkConnectionParameters {
  maximumSize?: number;
  redundantOwner?: boolean;
  type?: number;
  priority?: number;
  sizeType?: number;
}

const MaximumNormalConnectionSize = 0b111111111; /** 511 */
const MaximumLargeConnectionSize = 0xFFFF;

function buildNetworkConnectionParametersCode(options: NetworkConnectionParameters) {
  let code = 0;
  const large = options.maximumSize! > MaximumNormalConnectionSize;

  if (large === true) {
    code |= (options.redundantOwner ? 1 : 0! & 1) << 31;
    code |= (options.type! & 3) << 29;
    /** Bit 28 reserved */
    code |= (options.priority! & 3) << 26;
    code |= (options.sizeType! & 1) << 25;
    /** Bits 16 through 24 reserved */
    code |= (options.maximumSize! & MaximumLargeConnectionSize);
  } else {
    code |= (options.redundantOwner ? 1: 0! & 1) << 15;
    code |= (options.type! & 3) << 13;
    /** Bit 12 reserved */
    code |= (options.priority! & 3) << 10;
    code |= (options.sizeType! & 1) << 9;
    code |= (options.maximumSize! & MaximumNormalConnectionSize);
  }
  return code;
}

export interface ConnectionOptions {
  route?: Buffer;
  large?: boolean;
  connectionSerialNumber?: number;
  vendorID?: number;
  originatorSerialNumber?: number;
  transportClassTrigger?: ConnectionTransportClassTrigger;
  OtoTRPI?: number;
  TtoORPI?: number;
  OtoTNetworkConnectionParameters?: NetworkConnectionParameters;
  TtoONetworkConnectionParameters?: NetworkConnectionParameters;
}

export default class Connection {
  options: ConnectionOptions;
  sequenceCount: number;
  transportClassTriggerCode: number

  constructor(options?: ConnectionOptions) {
    this.options = {
      route: Buffer.alloc(0),
      large: false,
      connectionSerialNumber: 1,
      OtoTRPI: 2000000,
      TtoORPI: 2000000,
      ...options,
      transportClassTrigger: {
        ...options?.transportClassTrigger,
      }
    };
    this.sequenceCount = 0;
    this.transportClassTriggerCode = buildTransportClassTriggerCode(this.options.transportClassTrigger!);
  }

  static EncodeConnectedMessage(sequenceCount: number, message: Buffer) {
    const buffer = Buffer.allocUnsafe(message.length + 2);
    buffer.writeUInt16LE(sequenceCount, 0);
    message.copy(buffer, 2);
    return buffer;
  }
}
