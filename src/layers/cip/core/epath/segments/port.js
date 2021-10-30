'use strict';

/**
 * CIP Vol 1, Appendix C-1.4.1
 *
 * The port segment shall indicate the communication port
 * through which to leave the node and the link address of
 * the next device in the routing path.
 *
 * Examples:
 * ----
 * 0x02, 0x06
 * Segment Type = Port Segment. Port Number = 2, Link Address = 6
 * -----
 * 0x0F, 0x12, 0x00, 0x01
 * Segment Type = Port Segment. Port Identifier is 15 indicating the Port Number is
 * specified in the next 16 bit field [12][00] (18 decimal). Link Address = 1.
 * -----
 * 0x15, 0x0F, 0x31, 0x33, 0x30, 0x2E,
 * 0x31, 0x35, 0x31, 0x2E, 0x31, 0x33,
 * 0x37, 0x2E, 0x31, 0x30, 0x35, 0x00
 * Segment Type = Port Segment. Multi-Byte address for TCP Port 5, Link Address
 * 130.151.137.105 (IP Address). The address is defined as a character array, length
 * of 15 bytes. The last byte in the segment is a pad byte.
 * -----
 */

const {
  getBits,
  unsignedIntegerSize,
  encodeUnsignedInteger,
} = require('../../../../../utils');

function serializeAddress(address) {
  if (Buffer.isBuffer(address)) {
    return address;
  }

  if (Number.isInteger(address) && address >= 0) {
    const addressSize = unsignedIntegerSize(address);
    const buffer = Buffer.alloc(addressSize);
    encodeUnsignedInteger(buffer, 0, address, addressSize);
    return buffer;
  }

  if (typeof address === 'string') {
    return Buffer.from(address, 'ascii');
  }

  throw new Error(`Unexpected port address, unable to serialize: ${address}`);
}

function validate(number, address) {
  if (!Number.isInteger(number) || number < 0 || number > 65535) {
    throw new Error(`Port segment port number must be an integer between 0 and 65535. Received: ${number}`);
  }

  if (!Buffer.isBuffer(address) || address.length < 1 || address.length > 255) {
    throw new Error(`Port segment address should be a buffer with length ranging from 1 to 255. Received: ${address}`);
  }
}

class PortSegment {
  constructor(number, address) {
    address = serializeAddress(address);

    validate(number, address);

    this.number = number;
    this.address = address;
  }

  encodeSize() {
    let size = 1;
    if (this.number >= 15) {
      size += 2;
    }

    const addressLength = this.address.length;

    size += addressLength;

    if (addressLength > 1) {
      size += 1;
      size += size % 2;
    }

    return size;
  }

  encode() {
    const buffer = Buffer.alloc(this.encodeSize());
    this.encodeTo(buffer, 0);
    return buffer;
  }

  encodeTo(buffer, offset) {
    const startingOffset = offset;

    let code = 0;
    if (this.number >= 15) {
      code |= 15;
    } else {
      code |= this.number;
    }

    const addressLength = this.address.length;

    if (addressLength > 1) {
      code |= 0b00010000;
    }

    offset = buffer.writeUInt8(code, offset);

    if (addressLength > 1) {
      offset = buffer.writeUInt8(addressLength, offset);
    }

    if (this.number >= 15) {
      offset = buffer.writeUInt16LE(this.number, offset);
    }

    const addressLengthCopied = this.address.copy(buffer, offset);

    if (addressLengthCopied < addressLength) {
      throw new Error('Buffer is not large enough');
    }

    offset += addressLength;

    if (addressLength > 1 && (offset - startingOffset) % 2 > 0) {
      offset = buffer.writeUInt8(0, offset); /** Handle pad byte */
    }

    return offset;
  }

  static Decode(buffer, offsetRef, segmentCode /* , padded */) {
    /** -1 because first byte of segment was already read */
    const startingOffset = offsetRef.current - 1;

    let addressLength;
    if (getBits(segmentCode, 4, 5)) {
      addressLength = buffer.readUInt8(offsetRef.current); offsetRef.current += 1;
    } else {
      addressLength = 1;
    }

    let number;
    const tempNumber = getBits(segmentCode, 0, 4);
    if (tempNumber === 15) {
      number = buffer.readUInt16LE(offsetRef.current); offsetRef.current += 2;
    } else {
      number = tempNumber;
    }

    if (buffer.length < offsetRef.current + addressLength) {
      throw new Error('Port Segment decode buffer not long enough');
    }

    const address = buffer.slice(offsetRef.current, offsetRef.current + addressLength);
    offsetRef.current += addressLength;

    if (addressLength > 1 && (offsetRef.current - startingOffset) % 2 > 0) {
      /** make sure pad byte is 0 */
      const padByte = buffer.readUInt8(offsetRef.current); offsetRef.current += 1;
      if (padByte !== 0) {
        throw new Error(`Port Segment pad byte is not zero. Received: ${padByte}`);
      }
    }

    return new PortSegment(number, address);
  }
}

module.exports = PortSegment;
