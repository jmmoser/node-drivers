'use strict';

/**
 * CIP Vol 1, Appendix C-1.4.1
 * 
 * The port segment shall indicate the communication port
 * through which to leave the node and the link address of
 * the next device in the routing path.
 */

const {
  getBit,
  getBits
} = require('../../../../../utils');

class PortSegment {
  static Decode(buffer, offset, cb) {
    const segmentCode = buffer.readUInt8(offset); offset += 1;

    if (getBits(segmentCode, 5, 8) !== 0) {
      throw new Error('Not a port segment');
    }

    const extendedLinkAddress = getBit(segmentCode, 4);

    if (cb instanceof Function) {
      cb(value);
    }

    return offset;
  }
}

module.exports = PortSegment;