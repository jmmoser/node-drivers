import { getBits, InvertKeyValues } from '../../../../utils.js';
import CIPIdentity from '../../../../core/cip/objects/Identity.js';

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

const ItemTypeIDNames = InvertKeyValues(ItemTypeIDs);

const SocketFamilyNames = Object.freeze({
  2: 'AF_INET',
});

class Packet {
  static EncodeUCMM(data) {
    const buffer = Buffer.allocUnsafe(10 + data.length);
    buffer.writeUInt16LE(2, 0); // One address item and one data item
    buffer.writeUInt16LE(ItemTypeIDs.NullAddress, 2); // AddressTypeID 0 to indicate a UCMM message
    buffer.writeUInt16LE(0, 4); // AddressLength = 0 since UCMM messages use the NULL address item
    buffer.writeUInt16LE(ItemTypeIDs.UnconnectedMessage, 6);
    buffer.writeUInt16LE(data.length, 8);
    data.copy(buffer, 10);
    return buffer;
  }

  static EncodeConnected(connectionIdentifier, data) {
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

  static Decode(buffer, offsetRef) {
    const items = [];
    const itemCount = buffer.readUInt16LE(offsetRef.current); offsetRef.current += 2;

    for (let i = 0; i < itemCount; i++) {
      const type = buffer.readUInt16LE(offsetRef.current); offsetRef.current += 2;

      const item = {
        type: {
          code: type,
          name: ItemTypeIDNames[type] || 'Reserved',
        },
      };

      const dataLength = buffer.readUInt16LE(offsetRef.current); offsetRef.current += 2;
      item.data = buffer.slice(offsetRef.current, offsetRef.current + dataLength);

      const dataStartingOffset = offsetRef.current;

      switch (type) {
        case ItemTypeIDs.NullAddress:
          if (dataLength !== 0) {
            console.log(buffer);
            throw new Error('EIP CPF Null Address type item received with non-zero data length');
          }
          break;
        case ItemTypeIDs.ConnectedAddress: {
          if (dataLength === 4) {
            item.address = buffer.readUInt32LE(offsetRef.current); offsetRef.current += 4;
          } else {
            throw new Error(`EIP Connected Address CPF item expected length 4, received: ${dataLength}`, item);
          }
          break;
        }
        case ItemTypeIDs.ListIdentity: {
          const value = {};

          value.encapsulationProtocolVersion = buffer.readUInt16LE(offsetRef.current);
          offsetRef.current += 2;

          const socket = {};
          const familyCode = buffer.readInt16BE(offsetRef.current); offsetRef.current += 2;
          socket.family = {
            code: familyCode,
            name: SocketFamilyNames[familyCode] || 'Unknown',
          };
          socket.port = buffer.readUInt16BE(offsetRef.current); offsetRef.current += 2;

          socket.address = [
            buffer.readUInt8(offsetRef.current + 0).toString(),
            buffer.readUInt8(offsetRef.current + 1).toString(),
            buffer.readUInt8(offsetRef.current + 2).toString(),
            buffer.readUInt8(offsetRef.current + 3).toString(),
          ].join('.'); offsetRef.current += 4;

          socket.zero = buffer.slice(offsetRef.current, offsetRef.current + 8);
          offsetRef.current += 8;
          value.socket = socket;

          value.attributes = CIPIdentity.DecodeInstanceAttributesAll(
            buffer,
            offsetRef,
          );

          value.attributes.push(CIPIdentity.DecodeInstanceAttribute(
            buffer,
            offsetRef,
            CIPIdentity.InstanceAttribute.State,
          ));

          item.value = value;
          break;
        }
        case ItemTypeIDs.ListServices: {
          const value = {};
          value.version = buffer.readUInt16LE(offsetRef.current); offsetRef.current += 2;
          value.flags = {};
          const flags = buffer.readUInt16LE(offsetRef.current); offsetRef.current += 2;
          value.flags.code = flags;
          value.flags.supportsCIPPacketEncapsulationViaTCP = !!getBits(flags, 5, 6);
          value.flags.supportsCIPClass0or1UDPBasedConnections = !!getBits(flags, 8, 9);

          let nameLength;
          for (nameLength = 0; nameLength <= 16; nameLength++) {
            if (buffer[offsetRef.current + nameLength] === 0) {
              break;
            }
          }
          value.name = buffer.toString('ascii', offsetRef.current, offsetRef.current + nameLength);
          offsetRef.current += 16;

          item.value = value;
          break;
        }
        case ItemTypeIDs.SequencedAddress: {
          if (dataLength === 8) {
            const connectionID = buffer.readUInt32LE(offsetRef.current); offsetRef.current += 4;
            const sequenceNumber = buffer.readUInt32LE(offsetRef.current); offsetRef.current += 4;
            item.address = {
              connectionID,
              sequenceNumber,
            };
          } else {
            throw new Error(`EIP Sequenced Address CPF item expected length 8, received: ${dataLength}`, item);
          }
          break;
        }
        case ItemTypeIDs.UnconnectedMessage:
        default:
          offsetRef.current += dataLength;
          break;
      }

      if (offsetRef.current !== dataStartingOffset + dataLength) {
        throw new Error('CPF packet item data length was incorrect');
      }

      items.push(item);
    }

    return items;
  }
}

export default {
  Packet,
  ItemTypeIDs,
};
