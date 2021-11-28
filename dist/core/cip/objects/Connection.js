import { DataType } from '../datatypes/types';
import EPath from '../epath/index';
import { ClassCodes } from '../constants/classes';
// /** CIP Vol1 Table 3-4.2 */
// enum ClassServices {
//   /** Common */
//   Create = CommonServiceCodes.Create,
//   Delete = CommonServiceCodes.Delete,
//   Reset = CommonServiceCodes.Reset,
//   FindNextObjectInstance = CommonServiceCodes.FindNextObjectInstance,
//   GetAttributeSingle = CommonServiceCodes.GetAttributeSingle,
//   /** Class Specific */
//   ConnectionBind = 0x4B,
//   ProducingApplicationLookup = 0x4C,
//   SafetyClose = 0x4E,
//   SafetyOpen = 0x54
// };
// CIP Vol 1, Table 3-4.9 (p 3-13)
var InstanceAttributeCodes;
(function (InstanceAttributeCodes) {
    InstanceAttributeCodes[InstanceAttributeCodes["State"] = 1] = "State";
    InstanceAttributeCodes[InstanceAttributeCodes["Type"] = 2] = "Type";
    InstanceAttributeCodes[InstanceAttributeCodes["TransportClassTrigger"] = 3] = "TransportClassTrigger";
    InstanceAttributeCodes[InstanceAttributeCodes["DeviceNetProducedConnectionID"] = 4] = "DeviceNetProducedConnectionID";
    InstanceAttributeCodes[InstanceAttributeCodes["DeviceNetConsumedConnectionID"] = 5] = "DeviceNetConsumedConnectionID";
    InstanceAttributeCodes[InstanceAttributeCodes["DeviceNetInitialCommCharacteristics"] = 6] = "DeviceNetInitialCommCharacteristics";
    InstanceAttributeCodes[InstanceAttributeCodes["ProducedConnectionSize"] = 7] = "ProducedConnectionSize";
    InstanceAttributeCodes[InstanceAttributeCodes["ConsumedConnectionSize"] = 8] = "ConsumedConnectionSize";
    InstanceAttributeCodes[InstanceAttributeCodes["ExpectedPacketRate"] = 9] = "ExpectedPacketRate";
    InstanceAttributeCodes[InstanceAttributeCodes["CIPProducedConnectionID"] = 10] = "CIPProducedConnectionID";
    InstanceAttributeCodes[InstanceAttributeCodes["CIPConsumedConnectionID"] = 11] = "CIPConsumedConnectionID";
    InstanceAttributeCodes[InstanceAttributeCodes["WatchdogTimeoutAction"] = 12] = "WatchdogTimeoutAction";
    InstanceAttributeCodes[InstanceAttributeCodes["ProducedConnectionPathLength"] = 13] = "ProducedConnectionPathLength";
    InstanceAttributeCodes[InstanceAttributeCodes["ProducedConnectionPath"] = 14] = "ProducedConnectionPath";
    InstanceAttributeCodes[InstanceAttributeCodes["ConsumedConnectionPathLength"] = 15] = "ConsumedConnectionPathLength";
    InstanceAttributeCodes[InstanceAttributeCodes["ConsumedConnectionPath"] = 16] = "ConsumedConnectionPath";
    InstanceAttributeCodes[InstanceAttributeCodes["ProductionInhibitTime"] = 17] = "ProductionInhibitTime";
    InstanceAttributeCodes[InstanceAttributeCodes["ConnectionTimeoutMultiplier"] = 18] = "ConnectionTimeoutMultiplier";
    InstanceAttributeCodes[InstanceAttributeCodes["ConnectionBindingList"] = 19] = "ConnectionBindingList";
})(InstanceAttributeCodes || (InstanceAttributeCodes = {}));
;
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
    [InstanceAttributeCodes.ConnectionBindingList]: DataType.TRANSFORM(DataType.STRUCT([
        DataType.UINT,
        DataType.PLACEHOLDER((length) => DataType.ABBREV_ARRAY(DataType.UINT, length)),
    ], (members, dt) => {
        if (members.length === 1) {
            return dt.resolve(members[0]);
        }
        return undefined;
    }), (val) => val[1]),
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
export var TypeCodes;
(function (TypeCodes) {
    TypeCodes[TypeCodes["Null"] = 0] = "Null";
    TypeCodes[TypeCodes["Multicast"] = 1] = "Multicast";
    TypeCodes[TypeCodes["PointToPoint"] = 2] = "PointToPoint";
})(TypeCodes || (TypeCodes = {}));
export var PriorityCodes;
(function (PriorityCodes) {
    PriorityCodes[PriorityCodes["Low"] = 0] = "Low";
    PriorityCodes[PriorityCodes["High"] = 1] = "High";
    PriorityCodes[PriorityCodes["Scheduled"] = 2] = "Scheduled";
    PriorityCodes[PriorityCodes["Urgent"] = 3] = "Urgent";
})(PriorityCodes || (PriorityCodes = {}));
export var SizeTypeCodes;
(function (SizeTypeCodes) {
    SizeTypeCodes[SizeTypeCodes["Fixed"] = 0] = "Fixed";
    SizeTypeCodes[SizeTypeCodes["Variable"] = 1] = "Variable";
})(SizeTypeCodes || (SizeTypeCodes = {}));
/** For Transport Class Trigger Attribute */
export var TransportClassCodes;
(function (TransportClassCodes) {
    TransportClassCodes[TransportClassCodes["Class0"] = 0] = "Class0";
    TransportClassCodes[TransportClassCodes["Class1"] = 1] = "Class1";
    TransportClassCodes[TransportClassCodes["Class2"] = 2] = "Class2";
    TransportClassCodes[TransportClassCodes["Class3"] = 3] = "Class3";
})(TransportClassCodes || (TransportClassCodes = {}));
export var TransportProductionTriggerCodes;
(function (TransportProductionTriggerCodes) {
    TransportProductionTriggerCodes[TransportProductionTriggerCodes["Cyclic"] = 0] = "Cyclic";
    TransportProductionTriggerCodes[TransportProductionTriggerCodes["ChangeOfState"] = 1] = "ChangeOfState";
    TransportProductionTriggerCodes[TransportProductionTriggerCodes["ApplicationObject"] = 2] = "ApplicationObject";
})(TransportProductionTriggerCodes || (TransportProductionTriggerCodes = {}));
export var TransportDirectionCodes;
(function (TransportDirectionCodes) {
    TransportDirectionCodes[TransportDirectionCodes["Client"] = 0] = "Client";
    TransportDirectionCodes[TransportDirectionCodes["Server"] = 1] = "Server";
})(TransportDirectionCodes || (TransportDirectionCodes = {}));
const TransportClassCodesSet = new Set(Object.values(TransportClassCodes));
const TransportProductionTriggerCodesSet = new Set(Object.values(TransportProductionTriggerCodes));
const TransportDirectionCodesSet = new Set(Object.values(TransportDirectionCodes));
const MaximumNormalConnectionSize = 0b111111111; /** 511 */
const MaximumLargeConnectionSize = 0xFFFF;
export default class Connection {
    constructor(options) {
        this.options = {
            vendorID: 0x1339,
            originatorSerialNumber: 42,
            connectionTimeoutMultiplier: 1,
            route: EPath.Encode(true, [
                new EPath.Segments.Logical(EPath.Segments.Logical.Types.ClassID, ClassCodes.MessageRouter),
                new EPath.Segments.Logical(EPath.Segments.Logical.Types.InstanceID, 1),
            ]),
            large: false,
            connectionSerialNumber: 1,
            OtoTRPI: 2000000,
            TtoORPI: 2000000,
            tickTime: 6,
            timeoutTicks: 156,
            overrideLarge: false,
            ...options,
            transportClassTrigger: {
                class: TransportClassCodes.Class3,
                productionTrigger: TransportProductionTriggerCodes.ApplicationObject,
                direction: TransportDirectionCodes.Server,
                ...options?.transportClassTrigger,
            },
            networkConnectionParameters: {
                redundantOwner: false,
                type: TypeCodes.PointToPoint,
                priority: PriorityCodes.Low,
                sizeType: SizeTypeCodes.Variable,
                maximumSize: 500,
                ...options?.networkConnectionParameters,
            },
        };
        this.large = options?.overrideLarge || this.options.networkConnectionParameters.maximumSize > 500;
        this.sequenceCount = 0;
        this.transportClassTriggerCode = Connection.BuildTransportClassTriggerCode(this.options.transportClassTrigger);
        this.OtoTNetworkConnectionParametersCode = Connection.BuildNetworkConnectionParametersCode(this.options.networkConnectionParameters);
        this.TtoONetworkConnectionParametersCode = this.OtoTNetworkConnectionParametersCode;
    }
    incrementSequenceCount() {
        this.sequenceCount = (this.sequenceCount + 1) % 0x10000;
        return this.sequenceCount;
    }
    static BuildTransportClassTriggerCode(transport) {
        if (!TransportClassCodesSet.has(transport.class)) {
            throw new Error(`CIP Connection invalid transport class ${transport.class}`);
        }
        if (!TransportProductionTriggerCodesSet.has(transport.productionTrigger)) {
            throw new Error(`CIP Connection invalid transport production trigger ${transport.productionTrigger}`);
        }
        if (!TransportDirectionCodesSet.has(transport.direction)) {
            throw new Error(`CIP Connection invalid transport direction ${transport.direction}`);
        }
        return (((transport.direction ? 0 : 1 & 0b1) << 7)
            | ((transport.productionTrigger & 0b111) << 4)
            | ((transport.class & 0b1111)));
    }
    static BuildNetworkConnectionParametersCode(options) {
        let code = 0;
        const large = options.maximumSize > MaximumNormalConnectionSize;
        if (large === true) {
            code |= (options.redundantOwner ? 1 : 0 & 1) << 31;
            code |= (options.type & 3) << 29;
            /** Bit 28 reserved */
            code |= (options.priority & 3) << 26;
            code |= (options.sizeType & 1) << 25;
            /** Bits 16 through 24 reserved */
            code |= (options.maximumSize & MaximumLargeConnectionSize);
        }
        else {
            code |= (options.redundantOwner ? 1 : 0 & 1) << 15;
            code |= (options.type & 3) << 13;
            /** Bit 12 reserved */
            code |= (options.priority & 3) << 10;
            code |= (options.sizeType & 1) << 9;
            code |= (options.maximumSize & MaximumNormalConnectionSize);
        }
        return code;
    }
    static EncodeConnectedMessage(sequenceCount, message) {
        const buffer = Buffer.allocUnsafe(message.length + 2);
        buffer.writeUInt16LE(sequenceCount, 0);
        message.copy(buffer, 2);
        return buffer;
    }
}
