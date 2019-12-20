'use strict';

/**
 * CIP Vol 1, Appendix C-1.4.1
 * 
 * The port segment shall indicate the communication port
 * through which to leave the node and the link address of
 * the next device in the routing path.
 * 
 * CAN THE PORT SEGMENT EVER BE PACKED??? DOES IT NOT INCLUDE A PAD BYTE???
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
  getBit,
  getBits,
  sizeToEncodeUnsignedInteger,
  encodeUnsignedInteger
} = require('../../../../../utils');

class PortSegment {
  constructor(number, address) {
    address = serializeAddress(address);

    validate(number, address);

    this.number = number;
    this.address = address;
  }


  encodeSize() {
    return encodeSize(this.number, this.address);
  }


  encode() {
    const buffer = encodeBuffer(this.number, this.address);
    encodeTo(buffer, 0, this.number, this.address);
    return buffer;
  }


  encodeTo(buffer, offset) {
    return encodeTo(buffer, offset, this.number, this.address);
  }


  static Validate(number, address) {
    return validate(number, serializeAddress(address));
  }


  static EncodeSize(number, address) {
    return (new PortSegment(number, address)).encodeSize();
  }


  static Encode(number, address) {
    return (new PortSegment(number, address)).encode();
  }


  static EncodeTo(buffer, offset, number, address) {
    return (new PortSegment(number, address)).encodeTo(buffer, offset);
  }


  static Decode(segmentCode, buffer, offset, padded, cb) {
    const startingOffset = offset - 1; /** -1 because first byte of segment was already read */

    let addressLength;
    if (getBit(segmentCode, 4)) {
      addressLength = buffer.readUInt8(offset); offset += 1;
    } else {
      addressLength = 1;
    }

    let number;
    const tempNumber = getBits(segmentCode, 0, 4);
    if (tempNumber === 15) {
      number = buffer.readUInt16LE(offset); offset += 2;
    } else {
      number = tempNumber;
    }

    const address = buffer.slice(offset, offset + addressLength); offset += addressLength;

    if (addressLength > 1) {
      offset += (offset - startingOffset) % 2; /** Handle pad byte */
    }

    if (typeof cb === 'function') {
      // cb({
      //   number,
      //   address
      // });
      cb(new PortSegment(number, address));
    }

    return offset;
  }
}

module.exports = PortSegment;


function serializeAddress(address) {
  if (Buffer.isBuffer(address)) {
    return address;
  } else if (Number.isInteger(address) && address >= 0) {
    const addressSize = sizeToEncodeUnsignedInteger(address);
    const buffer = Buffer.alloc(addressSize);
    encodeUnsignedInteger(buffer, 0, address, addressSize);
    return buffer;
  } else if (typeof address === 'string') {
    return Buffer.from(address, 'ascii');
  } else {
    throw new Error(`Unexpected port address, unable to serialize: ${address}`);
  }
}


function validate(number, address) {
  if (!Number.isInteger(number) || number < 0 || number > 65535) {
    console.log(new Error());
    throw new Error(`Port segment port number must be an integer between 0 and 65535. Received: ${number}`);
  }

  if (!Buffer.isBuffer(address) || address.length < 1 || address.length > 255) {
    throw new Error(`Port segment address should be a buffer with length ranging from 1 to 255. Received: ${address}`);
  }
}


function encodeSize(number, address) {
  let size = 1;
  if (number >= 15) {
    size += 2;
  }

  const addressLength = address.length;

  size += addressLength;

  if (addressLength > 1) {
    size += 1;
    size += size % 2;
  }

  return size;
}


function encodeBuffer(number, address) {
  return Buffer.alloc(encodeSize(number, address));
}


function encodeTo(buffer, offset, number, address) {
  const startingOffset = offset;

  let code = 0;
  if (number >= 15) {
    code |= 15;
  } else {
    code |= number;
  }

  const addressLength = address.length;

  if (addressLength > 1) {
    code |= 0b00010000;
  }

  offset = buffer.writeUInt8(code, offset);

  if (addressLength > 1) {
    offset = buffer.writeUInt8(addressLength, offset);
  }

  if (number >= 15) {
    offset = buffer.writeUInt16LE(number, offset);
  }

  const addressLengthCopied = address.copy(buffer, offset);

  if (addressLengthCopied < addressLength) {
    throw new Error(`Buffer is not large enough`);
  }

  offset += addressLength;

  if (addressLength > 1) {
    offset += (offset - startingOffset) % 2; /** Handle pad byte */
  }

  return offset;
}