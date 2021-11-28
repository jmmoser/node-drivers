import CPF from './cpf';
/*
  Communication Profile Families

  CPF 1: Foundation Fieldbus (H1, H2, HSE)
  CPF 2: CIP (ControlNet, EtherNet/IP, DeviceNet)
  CPF 3: Profibus (DP, PA, Profinet)
  CPF 4: P-Net (P-NET RS-485, P-NET RS-232, P-NET on IP)
  CPF 5: WorldFIP
  CPF 6: Interbus
  CPF 7: Swiftnet (widthdrawn)
  CPF 8: CC-Link
  CPF 9: HART
  CPF 10: Vnet/IP
  CPF 11: TCnet
  CPF 12: EtherCat
  CPF 13: Ethernet Powerlink
  CPF 14: EPA
  CPF 15: Modbus-RTPS (Modbus-RTPS, Modbus TCP)
  CPF 16: SERCOS
*/
const OFFSET_COMMAND = 0;
const OFFSET_DATA_LENGTH = 2;
const OFFSET_SESSION_HANDLE = 4;
const OFFSET_STATUS = 8;
const OFFSET_SENDER_CONTEXT = 12;
const OFFSET_OPTIONS = 20;
const OFFSET_DATA = 24;
const HEADER_LENGTH = OFFSET_DATA;
var Command;
(function (Command) {
    Command[Command["NOP"] = 0] = "NOP";
    Command[Command["ListServices"] = 4] = "ListServices";
    Command[Command["ListIdentity"] = 99] = "ListIdentity";
    Command[Command["ListInterfaces"] = 100] = "ListInterfaces";
    Command[Command["RegisterSession"] = 101] = "RegisterSession";
    Command[Command["UnregisterSession"] = 102] = "UnregisterSession";
    Command[Command["SendRRData"] = 111] = "SendRRData";
    Command[Command["SendUnitData"] = 112] = "SendUnitData";
    Command[Command["IndicateStatus"] = 114] = "IndicateStatus";
    Command[Command["Cancel"] = 115] = "Cancel";
})(Command || (Command = {}));
;
var CPFItemTypeIDs;
(function (CPFItemTypeIDs) {
    CPFItemTypeIDs[CPFItemTypeIDs["NullAddress"] = 0] = "NullAddress";
    CPFItemTypeIDs[CPFItemTypeIDs["ListIdentity"] = 12] = "ListIdentity";
    CPFItemTypeIDs[CPFItemTypeIDs["ConnectedAddress"] = 161] = "ConnectedAddress";
    CPFItemTypeIDs[CPFItemTypeIDs["ConnectedMessage"] = 177] = "ConnectedMessage";
    CPFItemTypeIDs[CPFItemTypeIDs["UnconnectedMessage"] = 178] = "UnconnectedMessage";
    CPFItemTypeIDs[CPFItemTypeIDs["ListServices"] = 256] = "ListServices";
    CPFItemTypeIDs[CPFItemTypeIDs["SockaddrInfoOtoT"] = 32768] = "SockaddrInfoOtoT";
    CPFItemTypeIDs[CPFItemTypeIDs["SockaddrInfoTtoO"] = 32769] = "SockaddrInfoTtoO";
    CPFItemTypeIDs[CPFItemTypeIDs["SequencedAddress"] = 32770] = "SequencedAddress";
})(CPFItemTypeIDs || (CPFItemTypeIDs = {}));
;
const NullSenderContext = Buffer.alloc(8);
const NoDataBuffer = Buffer.alloc(0);
const EIPStatusCodeDescriptions = Object.freeze({
    0x0000: 'Success',
    0x0001: 'The sender issued an invalid or unsupported encapsulation command.',
    0x0002: 'Insufficient memory resources in the receiver to handle the command.  This is not an application error.  Instead, it only results if the encapsulation layer cannot obtain memory resources that it needs.',
    0x0003: 'Poorly formed or incorrect data in the data in the data portion of the encapsulation message.',
    0x0064: 'An originator used an invalid session handle when sending an encapsulation message to the target.',
    0x0065: 'The target received a message of invalid length.',
    0x0069: 'Unsupported encapsulation protocol revision.',
});
// // EIP-CIP V1, 5-2.2, page 5-7
// const IdentityInstanceStateDescriptions = {
//   0: 'Nonexistent',
//   1: 'Device Self Testing',
//   2: 'Standby',
//   3: 'Operational',
//   4: 'Major Recoverable Fault',
//   5: 'Major Unrecoverable Fault',
//   255: 'Default for Get Attribute All service'
// };
function SendDataPacket(interfaceHandle, timeout, data) {
    const buffer = Buffer.allocUnsafe(data.length + 6);
    buffer.writeUInt32LE(interfaceHandle, 0);
    buffer.writeUInt16LE(timeout, 4);
    data.copy(buffer, 6);
    return buffer;
}
/**
 * EIPPacket is defraggable
 */
export default class EIPPacket {
    constructor() {
        this.command = {
            code: 0,
            description: 'Unknown',
        };
        this.sessionHandle = 0;
        this.senderContext = NullSenderContext;
        this.options = 0;
        this.data = NoDataBuffer;
        this.status = {
            code: 0,
            description: '',
        };
        this.items = [];
    }
    toBuffer() {
        return EIPPacket.Encode(this.command.code, this.sessionHandle, this.status.code, this.senderContext, this.options, this.data);
    }
    static fromBuffer(buffer, offsetRef) {
        const packet = new EIPPacket();
        packet.command.code = EIPPacket.Command(buffer, offsetRef);
        packet.command.description = Command[packet.command.code] || 'Unknown';
        packet.sessionHandle = EIPPacket.SessionHandle(buffer, offsetRef);
        packet.status.code = EIPPacket.Status(buffer, offsetRef);
        packet.senderContext = EIPPacket.SenderContext(buffer, offsetRef);
        packet.options = EIPPacket.Options(buffer, offsetRef);
        packet.data = EIPPacket.Data(buffer, offsetRef);
        offsetRef.current += HEADER_LENGTH;
        if (EIPStatusCodeDescriptions[packet.status.code]) {
            packet.status.description = EIPStatusCodeDescriptions[packet.status.code] || '';
        }
        if (packet.status.code === 0) {
            switch (packet.command.code) {
                case Command.ListServices:
                case Command.ListIdentity:
                case Command.ListInterfaces:
                    packet.items = CPF.Decode(buffer, offsetRef);
                    break;
                case Command.RegisterSession:
                    packet.protocol = buffer.readUInt16LE(offsetRef.current);
                    offsetRef.current += 2;
                    packet.flags = buffer.readUInt16LE(offsetRef.current);
                    offsetRef.current += 2;
                    break;
                case Command.SendRRData:
                case Command.SendUnitData:
                    // shall be 0 for CIP
                    packet.interfaceHandle = buffer.readUInt32LE(offsetRef.current);
                    offsetRef.current += 4;
                    // not used for reply
                    packet.timeout = buffer.readUInt16LE(offsetRef.current);
                    offsetRef.current += 2;
                    packet.items = CPF.Decode(buffer, offsetRef);
                    break;
                default:
                    console.log('EIPPacket Error: Unrecognized command:', Buffer.from([packet.command.code]));
            }
        }
        return packet;
    }
    static Encode(command, sessionHandle, status, senderContext, options, data) {
        const dataLength = Buffer.isBuffer(data) ? data.length : 0;
        const buffer = Buffer.alloc(HEADER_LENGTH + dataLength);
        buffer.writeUInt16LE(command, OFFSET_COMMAND);
        buffer.writeUInt16LE(dataLength, OFFSET_DATA_LENGTH);
        buffer.writeUInt32LE(sessionHandle, OFFSET_SESSION_HANDLE);
        buffer.writeUInt32LE(status, OFFSET_STATUS);
        (senderContext || NullSenderContext).copy(buffer, OFFSET_SENDER_CONTEXT, 0, 8);
        buffer.writeUInt32LE(options, OFFSET_OPTIONS);
        if (dataLength > 0) {
            data.copy(buffer, OFFSET_DATA);
        }
        return buffer;
    }
    static Command(buffer, startingOffsetRef) {
        return buffer.readUInt16LE(startingOffsetRef.current + OFFSET_COMMAND);
    }
    static DataLength(buffer, startingOffsetRef) {
        return buffer.readUInt16LE(startingOffsetRef.current + OFFSET_DATA_LENGTH);
    }
    static SessionHandle(buffer, startingOffsetRef) {
        return buffer.readUInt32LE(startingOffsetRef.current + OFFSET_SESSION_HANDLE);
    }
    static Status(buffer, startingOffsetRef) {
        return buffer.readUInt32LE(startingOffsetRef.current + OFFSET_STATUS);
    }
    static SenderContext(buffer, startingOffsetRef) {
        return buffer.slice(startingOffsetRef.current + OFFSET_SENDER_CONTEXT, startingOffsetRef.current + OFFSET_SENDER_CONTEXT + 8);
    }
    static Options(buffer, startingOffsetRef) {
        return buffer.readUInt32LE(startingOffsetRef.current + OFFSET_OPTIONS);
    }
    static Data(buffer, startingOffsetRef) {
        return buffer.slice(startingOffsetRef.current + OFFSET_DATA, startingOffsetRef.current + OFFSET_DATA + EIPPacket.DataLength(buffer, startingOffsetRef));
    }
    static EncodeSendRRDataMessage(sessionHandle, senderContext, data) {
        // INTERFACE HANDLE SHOULD BE 0 FOR ENCAPSULATING CIP PACKETS
        const cpfMessage = CPF.EncodeUCMM(data);
        const dataPacket = SendDataPacket(0, 0, cpfMessage);
        return EIPPacket.Encode(Command.SendRRData, sessionHandle, 0, senderContext, 0, dataPacket);
    }
    static EncodeSendUnitDataMessage(sessionHandle, interfaceHandle, timeout, connectionIdentifier, data) {
        const cpfMessage = CPF.EncodeConnected(connectionIdentifier, data);
        const dataPacket = SendDataPacket(interfaceHandle, timeout, cpfMessage);
        return EIPPacket.Encode(Command.SendUnitData, sessionHandle, 0, undefined, 0, dataPacket);
    }
    static UnregisterSessionRequest(sessionHandle, senderContext) {
        return EIPPacket.Encode(Command.UnregisterSession, sessionHandle, 0, senderContext, 0);
    }
    static RegisterSessionRequest(senderContext) {
        const protocolVersion = Buffer.from([0x01, 0x00, 0x00, 0x00]);
        return EIPPacket.Encode(Command.RegisterSession, 0, 0, senderContext, 0, protocolVersion);
    }
    static ListIdentityRequest() {
        return EIPPacket.Encode(Command.ListIdentity, 0, 0, NullSenderContext, 0);
    }
    static ListServicesRequest(senderContext) {
        return EIPPacket.Encode(Command.ListServices, 0, 0, senderContext, 0);
    }
    static ListInterfacesRequest() {
        return EIPPacket.Encode(Command.ListInterfaces, 0, 0, NullSenderContext, 0);
    }
    static NOPRequest() {
        return EIPPacket.Encode(Command.NOP, 0, 0, NullSenderContext, 0);
    }
    static IndicateStatusRequest() {
        return EIPPacket.Encode(Command.IndicateStatus, 0, 0, NullSenderContext, 0);
    }
    static CancelRequest() {
        return EIPPacket.Encode(Command.Cancel, 0, 0, NullSenderContext, 0);
    }
    static Length(buffer, startingOffsetRef) {
        if (buffer.length - startingOffsetRef.current < HEADER_LENGTH)
            return -1;
        return HEADER_LENGTH + EIPPacket.DataLength(buffer, startingOffsetRef);
    }
}
EIPPacket.CommandCodes = Command;
EIPPacket.CPFItemTypeIDs = CPFItemTypeIDs;