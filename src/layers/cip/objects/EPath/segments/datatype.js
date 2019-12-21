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


class DataTypeSegment {
  constructor(constructed, code) {
    this.constructed = constructed;
    this.value = {
      code
    };
  }

  static Decode(segmentCode, buffer, offset, padded, cb) {
    let code;
    let constructed;
    switch (getBits(segmentCode, 5, 8)) {
      case 5:
        // constructed = true;
        // break;

        // TODO
        throw new Error(`Constructed data type segment not yet supported`);
      case 6:
        constructed = false;
        code = segmentCode;
        break;
      default:
        throw new Error(`Invalid data type segment. Received segment code: ${segmentCode}`);
    }

    if (typeof cb === 'function') {
      if (constructed) {
        cb(new DataTypeSegment.Constructed(code));
      } else {
        cb(new DataTypeSegment.Elementary(code));
      }
      // cb(new DataTypeSegment(constructed, code));
    }

    return offset;
  }
}


DataTypeSegment.Elementary = class ElementaryDataTypeSegment extends DataTypeSegment {
  constructor(code) {
    super(false, code);
  }
}

DataTypeSegment.Constructed = class ElementaryDataTypeSegment extends DataTypeSegment {
  constructor(code) {
    super(true, code);
  }
}

module.exports = DataTypeSegment;