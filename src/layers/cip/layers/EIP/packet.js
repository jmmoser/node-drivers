'use strict';

const CPF = require('./cpf');

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

const HEADER_LENGTH = 24;
const FLAG_COMMAND = 0;
const FLAG_DATA_LENGTH = 2;
const FLAG_SESSION_HANDLE = 4;
const FLAG_STATUS = 8;
const FLAG_SENDER_CONTEXT = 12;
const FLAG_OPTIONS = 20;
const FLAG_DATA = HEADER_LENGTH;

const Command = Object.freeze({
  NOP: 0x0000,
  ListServices: 0x0004,
  ListIdentity: 0x0063,
  ListInterfaces: 0x0064,
  RegisterSession: 0x0065,
  UnregisterSession: 0x0066,
  SendRRData: 0x006F,
  SendUnitData: 0x0070,
  IndicateStatus: 0x0072, // needs to be added to EIPReply parsers
  Cancel: 0x0073, // needs to be added to EIPReply parsers
});

const CPFItemTypeIDs = Object.freeze({
  NullAddress: 0x0000, // address
  ListIdentity: 0x000C, // response
  ConnectedAddress: 0x00A1, // address
  ConnectedMessage: 0x00B1, // data
  UnconnectedMessage: 0x00B2, // data
  ListServices: 0x0100, // response
  SockaddrInfoOtoT: 0x8000, // data
  SockaddrInfoTtoO: 0x8001, // data
  SequencedAddress: 0x8002, // address (with sequence)
});

const NullSenderContext = Buffer.alloc(8);

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

class EIPPacket {
  constructor() {
    this.command = 0;
    this.dataLength = 0;
    this.sessionHandle = 0;
    this.senderContext = NullSenderContext;
    this.options = 0;
    this.data = Buffer.alloc(0);
    this.status = {
      code: 0,
      description: '',
    };
  }

  toBuffer() {
    return EIPPacket.Encode(
      this.command,
      this.sessionHandle,
      this.status.code,
      this.senderContext,
      this.options,
      this.data,
    );
  }

  static fromBuffer(buffer, offsetRef) {
    const packet = new EIPPacket();
    packet.command = EIPPacket.Command(buffer, offsetRef);
    packet.dataLength = EIPPacket.DataLength(buffer, offsetRef);
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
      switch (packet.command) {
        case Command.ListServices:
        case Command.ListIdentity:
        case Command.ListInterfaces:
          packet.items = CPF.Packet.Decode(buffer, offsetRef);
          break;
        case Command.RegisterSession:
          packet.protocol = buffer.readUInt16LE(offsetRef.current); offsetRef.current += 2;
          packet.flags = buffer.readUInt16LE(offsetRef.current); offsetRef.current += 2;
          break;
        case Command.SendRRData:
        case Command.SendUnitData:
          // shall be 0 for CIP
          packet.interfaceHandle = buffer.readUInt32LE(offsetRef.current);
          offsetRef.current += 4;
          // not used for reply
          packet.timeout = buffer.readUInt16LE(offsetRef.current);
          offsetRef.current += 2;
          packet.items = CPF.Packet.Decode(buffer, offsetRef);
          break;
        default:
          console.log('EIPPacket Error: Unrecognized command:', Buffer.from([packet.command]));
      }
    }

    return packet;
  }

  static Encode(command, sessionHandle, status, senderContext, options, data = []) {
    const dataLength = Buffer.isBuffer(data) ? data.length : 0;
    const buffer = Buffer.alloc(HEADER_LENGTH + dataLength);
    buffer.writeUInt16LE(command, FLAG_COMMAND);
    buffer.writeUInt16LE(dataLength, FLAG_DATA_LENGTH);
    buffer.writeUInt32LE(sessionHandle, FLAG_SESSION_HANDLE);
    buffer.writeUInt32LE(status.code, FLAG_STATUS);
    (senderContext || NullSenderContext).copy(buffer, FLAG_SENDER_CONTEXT, 0, 8);
    buffer.writeUInt32LE(options, FLAG_OPTIONS);
    if (dataLength > 0) {
      data.copy(buffer, FLAG_DATA);
    }
    return buffer;
  }

  static IsComplete(buffer, startingOffsetRef, length) {
    if (length < 24) return false;
    return (length >= EIPPacket.Length(buffer, startingOffsetRef));
  }

  static Command(buffer, startingOffsetRef) {
    return buffer.readUInt16LE(startingOffsetRef.current + FLAG_COMMAND);
  }

  static DataLength(buffer, startingOffsetRef) {
    return buffer.readUInt16LE(startingOffsetRef.current + FLAG_DATA_LENGTH);
  }

  static SessionHandle(buffer, startingOffsetRef) {
    return buffer.readUInt32LE(startingOffsetRef.current + FLAG_SESSION_HANDLE);
  }

  static Status(buffer, startingOffsetRef) {
    return buffer.readUInt32LE(startingOffsetRef.current + FLAG_STATUS);
  }

  static SenderContext(buffer, startingOffsetRef) {
    return buffer.slice(
      startingOffsetRef.current + FLAG_SENDER_CONTEXT,
      startingOffsetRef.current + FLAG_SENDER_CONTEXT + 8,
    );
  }

  static Options(buffer, startingOffsetRef) {
    return buffer.readUInt32LE(startingOffsetRef.current + FLAG_OPTIONS);
  }

  static Data(buffer, startingOffsetRef) {
    return buffer.slice(
      startingOffsetRef.current + FLAG_DATA,
      startingOffsetRef.current + FLAG_DATA + EIPPacket.DataLength(buffer, startingOffsetRef),
    );
  }

  static Length(buffer, startingOffsetRef) {
    return HEADER_LENGTH + EIPPacket.DataLength(buffer, startingOffsetRef);
  }

  static UnregisterSessionRequest(sessionHandle, senderContext) {
    return EIPPacket.Encode(Command.UnregisterSession, sessionHandle, 0, senderContext, 0, []);
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
}

EIPPacket.CommandCodes = Command;
EIPPacket.CPFItemTypeIDs = CPFItemTypeIDs;

module.exports = EIPPacket;
