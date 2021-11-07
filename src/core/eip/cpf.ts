import { getBits, InvertKeyValues } from '../../utils.js';
import CIPIdentity from '../cip/objects/Identity';

import { Ref, CodeDescriptionMap, CodedValue } from '../../types';

const ItemTypeIDs = Object.freeze({
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

const ItemTypeIDNames: CodeDescriptionMap = InvertKeyValues(ItemTypeIDs) as CodeDescriptionMap;

const SocketFamilyNames: CodeDescriptionMap = Object.freeze({
  2: 'AF_INET',
});



type NullAddressValue = null;

type ConnectedAddressValue = number;

type ListIdentityValue = {
  encapsulationProtocolVersion: number;
  socket: {
    family: CodedValue;
    port: number;
    address: string;
    zero: Buffer;
  }
  attributes: any[];
};

type ListServicesValue = {
  version: number;
  flags: {
    code: number;
    supportsCIPPacketEncapsulationViaTCP: boolean;
    supportsCIPClass0or1UDPBasedConnections: boolean;
  };
  name: string;
};

type SequencedAddressValue = {
  connectionID: number;
  sequenceNumber: number;
};

type UnconnectedMessageValue = Buffer;

export interface CPFPacket {
  type: CodedValue;
  // data: Buffer;
  value: NullAddressValue | ConnectedAddressValue | ListIdentityValue | ListServicesValue | SequencedAddressValue | UnconnectedMessageValue;
}

export default class CPF {
  static ItemTypeIDs = ItemTypeIDs;

  static EncodeUCMM(data: Buffer) {
    const buffer = Buffer.allocUnsafe(10 + data.length);
    buffer.writeUInt16LE(2, 0); // One address item and one data item
    buffer.writeUInt16LE(ItemTypeIDs.NullAddress, 2); // AddressTypeID 0 to indicate a UCMM message
    buffer.writeUInt16LE(0, 4); // AddressLength = 0 since UCMM messages use the NULL address item
    buffer.writeUInt16LE(ItemTypeIDs.UnconnectedMessage, 6);
    buffer.writeUInt16LE(data.length, 8);
    data.copy(buffer, 10);
    return buffer;
  }

  static EncodeConnected(connectionIdentifier: number, data: Buffer) {
    const buffer = Buffer.allocUnsafe(14 + data.length);
    buffer.writeUInt16LE(2, 0); // One address item and one data item
    buffer.writeUInt16LE(ItemTypeIDs.ConnectedAddress, 2);
    buffer.writeUInt16LE(4, 4);
    buffer.writeUInt32LE(connectionIdentifier, 6);
    buffer.writeUInt16LE(ItemTypeIDs.ConnectedMessage, 10);
    buffer.writeUInt16LE(data.length, 12);
    data.copy(buffer, 14);
    return buffer;
  }

  static DecodeNullAddressValue(buffer: Buffer, offsetRef: Ref, dataLength: number): NullAddressValue {
    if (dataLength !== 0) {
      console.log(buffer);
      throw new Error('EIP CPF Null Address type item received with non-zero data length');
    }
    return null;
  }

  static DecodeConnectedAddressValue(buffer: Buffer, offsetRef: Ref, dataLength: number): ConnectedAddressValue {
    if (dataLength === 4) {
      const value = buffer.readUInt32LE(offsetRef.current);
      offsetRef.current += 4;
      return value;
    }
    throw new Error(`EIP Connected Address CPF item expected length 4, received: ${dataLength}`);
  }

  static DecodeListIdentityValue(buffer: Buffer, offsetRef: Ref, dataLength: number): ListIdentityValue {
    const encapsulationProtocolVersion = buffer.readUInt16LE(offsetRef.current);
    offsetRef.current += 2;

    const familyCode = buffer.readInt16BE(offsetRef.current); offsetRef.current += 2;
    const port = buffer.readUInt16BE(offsetRef.current); offsetRef.current += 2;

    const address = [
      buffer.readUInt8(offsetRef.current + 0).toString(),
      buffer.readUInt8(offsetRef.current + 1).toString(),
      buffer.readUInt8(offsetRef.current + 2).toString(),
      buffer.readUInt8(offsetRef.current + 3).toString(),
    ].join('.'); offsetRef.current += 4;

    const zero = buffer.slice(offsetRef.current, offsetRef.current + 8);
    offsetRef.current += 8;

    const attributes = CIPIdentity.DecodeInstanceAttributesAll(
      buffer,
      offsetRef,
    );

    attributes.push(CIPIdentity.DecodeInstanceAttribute(
      buffer,
      offsetRef,
      CIPIdentity.InstanceAttribute.State,
    ));

    return {
      encapsulationProtocolVersion,
      socket: {
        family: {
          code: familyCode,
          description: SocketFamilyNames[familyCode] || 'Unknown',
        },
        port,
        address,
        zero,
      },
      attributes,
    };
  }

  static DecodeListServicesValue(buffer: Buffer, offsetRef: Ref, dataLength: number): ListServicesValue {
    const version = buffer.readUInt16LE(offsetRef.current); offsetRef.current += 2;
    const flags = buffer.readUInt16LE(offsetRef.current); offsetRef.current += 2;
    const supportsCIPPacketEncapsulationViaTCP = !!getBits(flags, 5, 6);
    const supportsCIPClass0or1UDPBasedConnections = !!getBits(flags, 8, 9);

    let nameLength;
    for (nameLength = 0; nameLength <= 16; nameLength++) {
      if (buffer[offsetRef.current + nameLength] === 0) {
        break;
      }
    }

    const name = buffer.toString('ascii', offsetRef.current, offsetRef.current + nameLength);
    offsetRef.current += 16;

    return {
      version,
      flags: {
        code: flags,
        supportsCIPPacketEncapsulationViaTCP,
        supportsCIPClass0or1UDPBasedConnections
      },
      name,
    };
  }

  static DecodeSequencedAddressValue(buffer: Buffer, offsetRef: Ref, dataLength: number): SequencedAddressValue {
    if (dataLength !== 8) {
      throw new Error(`EIP Sequenced Address CPF item expected length 8, received: ${dataLength}`);
    }

    const connectionID = buffer.readUInt32LE(offsetRef.current); offsetRef.current += 4;
    const sequenceNumber = buffer.readUInt32LE(offsetRef.current); offsetRef.current += 4;
    return {
      connectionID,
      sequenceNumber,
    };
  }

  static DecodeUnconnectedMessage(buffer: Buffer, offsetRef: Ref, dataLength: number): UnconnectedMessageValue {
    const value = buffer.slice(offsetRef.current, offsetRef.current + dataLength);
    offsetRef.current += dataLength;
    return value;
  }

  static Decode(buffer: Buffer, offsetRef: Ref) {
    const items: CPFPacket[] = [];
    const itemCount = buffer.readUInt16LE(offsetRef.current); offsetRef.current += 2;

    for (let i = 0; i < itemCount; i++) {
      const type = buffer.readUInt16LE(offsetRef.current); offsetRef.current += 2;

      const dataLength = buffer.readUInt16LE(offsetRef.current); offsetRef.current += 2;
      // const data = buffer.slice(offsetRef.current, offsetRef.current + dataLength);

      const dataStartingOffset = offsetRef.current;

      let value;

      switch (type) {
        case ItemTypeIDs.NullAddress:
          value = CPF.DecodeNullAddressValue(buffer, offsetRef, dataLength);
          break;
        case ItemTypeIDs.ConnectedAddress: {
          value = CPF.DecodeConnectedAddressValue(buffer, offsetRef, dataLength);
          break;
        }
        case ItemTypeIDs.ListIdentity: {
          value = CPF.DecodeListIdentityValue(buffer, offsetRef, dataLength);
          break;
        }
        case ItemTypeIDs.ListServices: {
          value = CPF.DecodeListServicesValue(buffer, offsetRef, dataLength);
          break;
        }
        case ItemTypeIDs.SequencedAddress: {
          value = CPF.DecodeSequencedAddressValue(buffer, offsetRef, dataLength);
          break;
        }
        case ItemTypeIDs.UnconnectedMessage:
        default:
          value = CPF.DecodeUnconnectedMessage(buffer, offsetRef, dataLength);
          break;
      }

      if (offsetRef.current !== dataStartingOffset + dataLength) {
        throw new Error('CPF packet item data length was incorrect');
      }

      items.push({
        type: {
          code: type,
          description: ItemTypeIDNames[type] || 'Reserved',
        },
        value,
      });
    }

    return items;
  }
}