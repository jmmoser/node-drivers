'use strict';

const CIPIdentity = require('../cip/objects/Identity');
const { getBit } = require('../../utils');

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

const Command = {
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
};

const CPFItemID = {
  NullAddress: 0x0000, // address
  ListIdentity: 0x000C, // response
  ConnectedAddress: 0x00A1, // address
  ConnectedMessage: 0x00B1, // data
  UnconnectedMessage: 0x00B2, // data
  ListServices: 0x0100, // response
  SockaddrInfoOtoT: 0x8000, // data
  SockaddrInfoTtoO: 0x8001, // data
  SequencedAddress: 0x8002 // address (with sequence)
};

const CPFItem = {
  Address: {
    Null: 0x00,
    Connected: 0xA1,
    Sequenced: 0x8002
  },
  Data: {
    Connected: 0xB1,
    Unconnected: 0xB2,
    SocketAddressOtoT: 0x8000,
    SocketAddressTtoO: 0x8001
  }
};

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
    const dataLength = this.data ? this.data.length : 0;
    const buffer = Buffer.alloc(24 + dataLength);
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
    packet.senderContext = Buffer.from(buffer.slice(12, 20));
    packet.options = buffer.readUInt32LE(20);
    packet.data = buffer.length > 24 ? Buffer.from(buffer.slice(24)) : Buffer.alloc(0);

    if (EIPStatusCodeDescriptions[packet.status.code]) {
      packet.status.description = EIPStatusCodeDescriptions[packet.status.code] || '';
    }

    const replyParse = EIPReply[packet.command];

    if (packet.status.code === 0) {
      if (replyParse) {
        replyParse(packet);
      } else {
        console.log('');
        console.log('EIPPacket Error: Unrecognized command:');
        console.log(Buffer.from([packet.command]));
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

EIPPacket.Command = Command;
EIPPacket.CPFItemID = CPFItemID;

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


const EIPReply = {};

EIPReply[Command.ListServices] = function(packet) {
  let offset = 0;
  const data = packet.data;
  const itemCount = data.readUInt16LE(offset); offset += 2;
  packet.items = [];
  for (let i = 0; i < itemCount; i++) {
    const item = {};
    item.type = data.readUInt16LE(offset); offset += 2;
    item.length = data.readUInt16LE(offset); offset += 2;
    item.version = data.readUInt16LE(offset); offset += 2;
    item.flags = {};
    const flags = data.readUInt16LE(offset); offset += 2;
    item.flags.code = flags;
    item.flags.supportsCIPPacketEncapsulationViaTCP = !!getBit(flags, 5);
    item.flags.supportsCIPClass0or1UDPBasedConnections = !!getBit(flags, 8);

    let serviceName = '';
    for (let j = 0; j < 16; j++) {
      if (data[offset + j] > 0) {
        serviceName += String.fromCharCode(data[offset + j]);
      } else {
        break;
      }
    }
    offset += 16;
    item.name = serviceName;
    
    packet.items.push(item);
  }
};

function ReadCPFPacket(packet, cb) {
  let offset = 0;
  const buffer = packet.data;
  packet.items = [];
  const itemCount = buffer.readUInt16LE(offset); offset += 2;

  for (let i = 0; i < itemCount; i++) {
    const item = {};
    item.type = buffer.readUInt16LE(offset); offset += 2;
    let length = buffer.readUInt16LE(offset); offset += 2;
    cb(item, length, offset, buffer);
    offset += length;
    packet.items.push(item);
  }
}

EIPReply[Command.ListIdentity] = function(packet) {
  ReadCPFPacket(packet, function(item, length, offset, buffer) {
    if (item.type === CPFItemID.ListIdentity) {
      item.encapsulationProtocolVersion = buffer.readUInt16LE(offset); offset += 2;

      const socket = {};
      socket.family = buffer.readInt16BE(offset); offset += 2;
      socket.port = buffer.readUInt16BE(offset); offset += 2;
      const addr = [];
      for (let i = 0; i < 4; i++) {
        addr.push(buffer.readUInt8(offset).toString()); offset += 1;
      }
      socket.address = addr.join('.');
      socket.zero = buffer.slice(offset, offset + 8); offset += 8;
      item.socket = socket;

      offset = CIPIdentity.ParseInstanceAttributesAll(buffer, offset, value => item.attributes = value);
      // offset = CIPIdentity.DecodeInstanceAttribute(CIPIdentity.InstanceAttribute.State, buffer, offset, val => item.attributes[CIPIdentity.InstanceAttribute.State] = val);
      offset = CIPIdentity.DecodeInstanceAttribute(CIPIdentity.InstanceAttribute.State, buffer, offset, val => item.attributes.push(val));
    }
    return offset;
  });
};

EIPReply[Command.RegisterSession] = function(packet) {
  let offset = 0;
  const data = packet.data;
  packet.protocol = data.readUInt16LE(offset); offset += 2;
  packet.flags = data.readUInt16LE(offset); offset += 2;
  return packet;
};


EIPReply[Command.ListInterfaces] = function(packet) {
  ReadCPFPacket(packet, function(item, length, offset, buffer) {
    item.data = buffer.slice(offset, offset + length);
    // this needs more work
    if (length >= 4) {
      item.interfaceHandle = buffer.readUInt32LE(offset); offset += 4;
    }
  });
};


// EIP-CIP-V1 2-7.3.1, page 2-21
// When used to encapsulate CIP, the format of the "data" field is
// that of a Message Router request or Message Router reply.
EIPReply[Command.SendRRData] = function(packet) {
  const data = packet.data;
  packet.interfaceHandle = data.readUInt32LE(0); // shall be 0 for CIP
  packet.timeout = data.readUInt16LE(4); // not used for reply
  packet.data = packet.data.slice(6);

  ReadCPFPacket(packet, function(item, length, offset, buffer) {
    if (item.type === CPFItemID.UnconnectedMessage) {
      item.data = buffer.slice(offset, offset + length);
    }
  });
};

EIPReply[Command.SendUnitData] = function(packet) {
  const data = packet.data;
  packet.interfaceHandle = data.readUInt32LE(0); // shall be 0 for CIP
  packet.timeout = data.readUInt16LE(4); // not used for reply
  packet.data = packet.data.slice(6);

  ReadCPFPacket(packet, function(item, length, offset, buffer) {
    switch (item.type) {
      case CPFItemID.ConnectedAddress:
        item.address = buffer.readUInt32LE(offset);
        break;
      case CPFItemID.ConnectedMessage:
        item.data = buffer.slice(offset, offset + length);
        break;
      default:
        break;
    }
  });
};

// const CPFItemIDDescriptions = {
//   0x0000: 'Null (used for UCMM messages).  Indicates that encapsulation routing is NOT needed.  Target is either local (ethernet) or routing info is in a data Item.',
//   0x000C: 'ListIdentity response',
//   0x00A1: 'Connection-based (used for connected messages)',
//   0x00B1: 'Connected Transport packet',
//   0x00B2: 'Unconnected message',
//   0x0100: 'ListServices response',
//   0x8000: 'Sockaddr Info, originator-to-target',
//   0x8001: 'Sockaddr Info, target-to-originator',
//   0x8002: 'Sequenced Address item'
// };

const EIPStatusCodeDescriptions = {
  0x0000: 'Success',
  0x0001: 'The sender issued an invalid or unsupported encapsulation command.',
  0x0002: 'Insufficient memory resources in the receiver to handle the command.  This is not an application error.  Instead, it only results if the encapsulation layer cannot obtain memory resources that it needs.',
  0x0003: 'Poorly formed or incorrect data in the data in the data portion of the encapsulation message.',
  0x0064: 'An originator used an invalid session handle when sending an encapsulation message to the target.',
  0x0065: 'The target received a message of invalid length.',
  0x0069: 'Unsupported encapsulation protocol revision.'
};

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
