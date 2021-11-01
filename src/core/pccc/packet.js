import {
  STSCodeDescriptions,
  EXTSTSCodeDescriptionsCMDF0,
} from './constants.js';

export default class PCCCPacket {
  constructor(command = 0, status = 0, transaction = 0, data) {
    this.command = command;
    this.transaction = transaction;
    this.data = data;

    this.status = {
      code: status,
      extended: {
        code: 0,
      },
    };
  }

  // this entire class method may not be needed
  // good for unit testing factory methods
  static fromBufferRequest(buffer, offsetRef) {
    const packet = new PCCCPacket();

    packet.service = buffer.readUInt8(offsetRef.current); offsetRef.current += 1;
    const pathSize = 2 * buffer.readUInt8(offsetRef.current); offsetRef.current += 1;
    packet.path = buffer.slice(offsetRef.current, offsetRef.current + pathSize);
    offsetRef.current += pathSize;
    const requestorIDLength = buffer.readUInt8(offsetRef.current); offsetRef.current += 1;
    packet.requestorID = buffer.slice(offsetRef.current, offsetRef.current + requestorIDLength);
    packet.vendorID = buffer.slice(offsetRef.current, offsetRef.current + 2);
    offsetRef.current += 2;
    packet.serialNumber = buffer.slice(offsetRef.current, offsetRef.current + 4);
    offsetRef.current += 4;

    if (requestorIDLength > 7) {
      packet.other = buffer.slice(offsetRef.current, offsetRef.current + requestorIDLength - 7);
      offsetRef.current += requestorIDLength - 7;
    }

    packet.command = buffer.readUInt8(offsetRef.current); offsetRef.current += 1;
    packet.status.code = buffer.readUInt8(offsetRef.current); offsetRef.current += 1;
    packet.transaction = buffer.readUInt16LE(offsetRef.current); offsetRef.current += 2;
    packet.data = buffer.slice(offsetRef.current);

    return packet;
  }

  static fromBufferReply(buffer, offsetRef) {
    const packet = new PCCCPacket();

    packet.command = buffer.readUInt8(offsetRef.current); offsetRef.current += 1;
    packet.status.code = buffer.readUInt8(offsetRef.current); offsetRef.current += 1;
    packet.status.description = STSCodeDescriptions[packet.status.code] || '';

    // if (buffer.length < 4) {
    //   return packet;
    // }

    packet.transaction = buffer.readUInt16LE(offsetRef.current); offsetRef.current += 2;

    if (packet.status.code === 0xF0) {
      packet.status.extended.code = buffer.readUInt8(offsetRef.current); offsetRef.current += 1;
      packet.status.extended.description = EXTSTSCodeDescriptionsCMDF0[packet.status.extended.code] || '';
    }

    packet.data = buffer.slice(offsetRef.current);
    offsetRef.current += packet.data.length;

    return packet;
  }

  static WordRangeReadReply(buffer) {
    // I believe there is a mistake in the DF1 manual,
    // The reply message should still contain a TNS
    return PCCCPacket.fromBufferReply(buffer, { current: 0 });
  }
}
