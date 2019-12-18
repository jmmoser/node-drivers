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
  getBit,
  getBits
} = require('../../../../../utils');

class PortSegment {
  static Decode(segmentCode, buffer, offset, padded, cb) {
    let linkAddressSize;
    if (getBit(segmentCode, 4)) {
      linkAddressSize = buffer.readUInt8(offset); offset += 1;
    } else {
      linkAddressSize = 1;
    }

    let number;
    const tempNumber = getBits(segmentCode, 0, 4);
    if (tempNumber === 15) {
      number = buffer.readUInt16LE(offset); offset += 2;
    } else {
      number = tempNumber;
    }

    const address = buffer.slice(offset, offset + linkAddressSize); offset += linkAddressSize;

    if (linkAddressSize > 1 && linkAddressSize % 2 !== 0) {
      offset += 1; /** Pad byte */
    }

    if (typeof cb === 'function') {
      cb({
        number,
        address
      });
    }

    return offset;
  }
}

module.exports = PortSegment;