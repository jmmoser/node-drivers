'use strict';

/**
 * CIP Vol 1, Appendix C-1.4.5
 *
 * The data segment provides a mechanism for delivering data to an application. This may occur
 * during connection establishment, or at any other time as defined by the application.
 */

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


class DataSegment {
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

module.exports = DataSegment;