'use strict';

/**
 * CIP Vol 1, Appendix C-1.4.3
 * 
 * The network segment shall be used to specify network parameters that may be required by a
 * node to transmit a message across a network. The network segment shall immediately precede
 * the port segment of the device to which it applies. In other words, the network segment shall
 * be the first item in the path that the device receives.
 */

const {
  getBit,
  getBits,
  InvertKeyValues
} = require('../../../../../utils');

const NetworkSegmentTypeCodes = {
  Schedule: 1,
  FixedTag: 2,
  ProductionInhibitTime: 3,
  Safety: 16,
  Extended: 31
};

const NetworkSegmentTypeNames = InvertKeyValues(NetworkSegmentTypeCodes);


class NetworkSegment {
  static Decode(segmentCode, buffer, offset, padded, cb) {


    if (typeof cb === 'function') {
      cb({
        // number,
        // address
      });
    }

    return offset;
  }
}

module.exports = NetworkSegment;