'use strict';

const CIPIdentity = require('../cip/objects/Identity');
const { getBit, InvertKeyValues } = require('../../utils');

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
  Cancel: 0x0073 // needs to be added to EIPReply parsers
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
  SequencedAddress: 0x8002 // address (with sequence)
});

const CPFItemTypeIDNames = InvertKeyValues(CPFItemTypeIDs);

const SocketFamilyNames = Object.freeze({
  2: 'AF_INET'
});

const NullSenderContext = Buffer.alloc(8);


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
      description: ''
    };
  }

  toBuffer(opts) {
    const dataLength = Buffer.isBuffer(this.data) ? this.data.length : 0;
    const buffer = Buffer.allocUnsafe(24 + dataLength);
    buffer.writeUInt16LE(this.command, 0);
    buffer.writeUInt16LE(dataLength, 2);
    buffer.writeUInt32LE(this.sessionHandle, 4);
    buffer.writeUInt32LE(this.status.code, 8);
    this.senderContext.copy(buffer, 12, 0, 8);
    buffer.writeUInt32LE(this.options, 20);
    if (dataLength > 0) {
      this.data.copy(buffer, 24);
    }
    return buffer;
  }


  static fromBuffer(buffer) {
    const packet = new EIPPacket();
    packet.command = buffer.readUInt16LE(0);
    packet.dataLength = EIPPacket.DataLength(buffer);
    packet.sessionHandle = buffer.readUInt32LE(4);
    packet.status.code = buffer.readUInt32LE(8);
    packet.senderContext = buffer.slice(12, 20);
    packet.options = buffer.readUInt32LE(20);
    packet.data = buffer.slice(24);

    if (EIPStatusCodeDescriptions[packet.status.code]) {
      packet.status.description = EIPStatusCodeDescriptions[packet.status.code] || '';
    }

    if (packet.status.code === 0) {
      switch (packet.command) {
        case Command.ListServices:
        case Command.ListIdentity:
        case Command.ListInterfaces:
          DecodeCPFItems(packet.data, 0, items => packet.items = items);
          break;
        case Command.RegisterSession:
          packet.protocol = packet.data.readUInt16LE(0);
          packet.flags = packet.data.readUInt16LE(2);
          break;
        case Command.SendRRData:
        case Command.SendUnitData:
          packet.interfaceHandle = packet.data.readUInt32LE(0); // shall be 0 for CIP
          packet.timeout = packet.data.readUInt16LE(4); // not used for reply
          DecodeCPFItems(packet.data, 6, items => packet.items = items);
          break;
        default:
          console.log('EIPPacket Error: Unrecognized command:', Buffer.from([packet.command]));
      }
    }

    return packet;
  }


  static toBuffer(command, handle, status, context, options, data = []) {
    return toBuffer(command, handle, status, context, options, data);
  }


  static IsComplete(buffer, length) {
    if (length < 24) return false;
    return (length >= EIPPacket.Length(buffer));
  }

  static NextMessage(buffer) {
    return buffer.slice(0, EIPPacket.Length(buffer));
  }

  static Length(buffer) {
    return 24 + EIPPacket.DataLength(buffer);
  }


  static DataLength(buffer) {
    return buffer.readUInt16LE(2);
  }

  static CommandFromBuffer(buffer, offset = 0) {
    return buffer.readUInt16LE(offset);
  }


  static UnregisterSessionRequest(sessionHandle, senderContext) {
    return toBuffer(Command.UnregisterSession, sessionHandle, 0, senderContext, 0, []);
  }

  static RegisterSessionRequest(senderContext) {
    return toBuffer(
      Command.RegisterSession,
      0,
      0,
      senderContext,
      0,
      Buffer.from([0x01, 0x00, 0x00, 0x00]) // Protocol Version
    );
  }

  static ListIdentityRequest() {
    return toBuffer(Command.ListIdentity, 0, 0, NullSenderContext, 0, []);
  }

  static ListServicesRequest(senderContext) {
    return toBuffer(Command.ListServices, 0, 0, senderContext, 0, []);
  }

  static ListInterfacesRequest() {
    return toBuffer(Command.ListInterfaces, 0, 0, NullSenderContext, 0, []);
  }

  static NOPRequest() {
    return toBuffer(Command.NOP, 0, 0, NullSenderContext, 0, []);
  }
}

EIPPacket.CommandCodes = Command;
EIPPacket.CPFItemTypeIDs = CPFItemTypeIDs;

module.exports = EIPPacket;


function toBuffer(command, handle, status, context, options, data = []) {
  const length = data.length;
  const buffer = Buffer.alloc(24 + length);
  buffer.writeUInt16LE(command, 0);
  buffer.writeUInt16LE(data.length, 2);
  buffer.writeUInt32LE(handle, 4);
  buffer.writeUInt32LE(status, 8);
  (context || NullSenderContext).copy(buffer, 12, 0, 8);
  buffer.writeUInt32LE(options, 20);
  if (length > 0) {
    data.copy(buffer, 24);
  }
  return buffer;
}


function DecodeCPFItems(buffer, offset, cb) {
  const items = [];
  const itemCount = buffer.readUInt16LE(offset); offset += 2;

  for (let i = 0; i < itemCount; i++) {
    const item = {};
    const type = buffer.readUInt16LE(offset); offset += 2;
    item.type = {
      code: type,
      name: CPFItemTypeIDNames[type] || 'Reserved'
    };
    const length = buffer.readUInt16LE(offset); offset += 2;
    const data = buffer.slice(offset, offset + length); offset += length;
    item.data = data;

    const lastOffset = offset;
    offset = 0;
    
    switch (type) {
      case CPFItemTypeIDs.NullAddress:
        if (length !== 0) {
          console.log(buffer);
          throw new Error(`EIP CPF Null Address type item received with non-zero data length`);
        }
        break;
      case CPFItemTypeIDs.ConnectedAddress: {
        if (length === 4) {
          // item.data = data.readUInt32LE(offset); offset += 4;
          item.address = data.readUInt32LE(offset); offset += 4;
        } else {
          throw new Error(`EIP Connected Address CPF item expected length 4, received: ${length}`, packet);
        }
        break;
      }
      case CPFItemTypeIDs.ListIdentity: {
        const value = {};

        value.encapsulationProtocolVersion = data.readUInt16LE(offset); offset += 2;

        const socket = {};
        const familyCode = data.readInt16BE(offset); offset += 2;
        socket.family = {
          code: familyCode,
          name: SocketFamilyNames[familyCode] || 'Unknown'
        };
        socket.port = data.readUInt16BE(offset); offset += 2;
        const addr = [];
        for (let i = 0; i < 4; i++) {
          addr.push(data.readUInt8(offset).toString()); offset += 1;
        }
        socket.address = addr.join('.');
        socket.zero = data.slice(offset, offset + 8); offset += 8;
        value.socket = socket;

        offset = CIPIdentity.DecodeInstanceAttributesAll(data, offset, val => value.attributes = val);
        // offset = CIPIdentity.DecodeInstanceAttribute(CIPIdentity.InstanceAttribute.State, data, offset, val => item.attributes[CIPIdentity.InstanceAttribute.State] = val);
        offset = CIPIdentity.DecodeInstanceAttribute(CIPIdentity.InstanceAttribute.State, data, offset, val => value.attributes.push(val));

        item.value = value;
        break;
      }
      case CPFItemTypeIDs.ListServices: {
        const value = {};
        value.version = data.readUInt16LE(offset); offset += 2;
        value.flags = {};
        const flags = data.readUInt16LE(offset); offset += 2;
        value.flags.code = flags;
        value.flags.supportsCIPPacketEncapsulationViaTCP = !!getBit(flags, 5);
        value.flags.supportsCIPClass0or1UDPBasedConnections = !!getBit(flags, 8);

        let nameLength;
        for (nameLength = 0; nameLength <= 16; nameLength++) {
          if (data[offset + j] === 0) {
            break;
          }
        }
        value.name = data.toString('ascii', offset, offset + nameLength); offset += 16;

        item.value = value;
        break;
      }
      case CPFItemTypeIDs.SequencedAddress: {
        if (length === 8) {
          const connectionID = data.readUInt32LE(0);
          const sequenceNumber = data.readUInt32LE(4);
          item.address = {
            connectionID,
            sequenceNumber
          };
        } else {
          throw new Error(`EIP Sequenced Address CPF item expected length 8, received: ${length}`, packet);
        }
        break;
      }
      default:
        break;
    }

    offset = lastOffset;

    items.push(item);
  }

  if (typeof cb === 'function') {
    cb(items);
  }

  return offset;
}


const EIPStatusCodeDescriptions = Object.freeze({
  0x0000: 'Success',
  0x0001: 'The sender issued an invalid or unsupported encapsulation command.',
  0x0002: 'Insufficient memory resources in the receiver to handle the command.  This is not an application error.  Instead, it only results if the encapsulation layer cannot obtain memory resources that it needs.',
  0x0003: 'Poorly formed or incorrect data in the data in the data portion of the encapsulation message.',
  0x0064: 'An originator used an invalid session handle when sending an encapsulation message to the target.',
  0x0065: 'The target received a message of invalid length.',
  0x0069: 'Unsupported encapsulation protocol revision.'
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
