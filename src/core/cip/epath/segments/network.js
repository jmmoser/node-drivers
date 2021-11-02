/**
 * CIP Vol 1, Appendix C-1.4.3
 *
 * The network segment shall be used to specify network parameters that may be required by a
 * node to transmit a message across a network. The network segment shall immediately precede
 * the port segment of the device to which it applies. In other words, the network segment shall
 * be the first item in the path that the device receives.
 */

import {
  getBits,
  InvertKeyValues,
} from '../../../../utils.js';

export const SubtypeCodes = Object.freeze({
  Schedule: 1,
  FixedTag: 2,
  ProductionInhibitTime: 3,
  Safety: 16,
  Extended: 31,
});

const SubtypeNames = Object.freeze(InvertKeyValues(SubtypeCodes));

export default class NetworkSegment {
  constructor(subtype, value) {
    this.subtype = {
      code: subtype,
      name: SubtypeNames[subtype] || 'Unknown',
    };
    this.value = value;
  }

  encodeSize() {
    switch (this.subtype.code) {
      case SubtypeCodes.Schedule:
      case SubtypeCodes.FixedTag:
      case SubtypeCodes.ProductionInhibitTime:
        return 2;
      default:
        throw new Error(`Network segment subtype ${this.subtype.name} not supported yet`);
    }
  }

  encode() {
    const buffer = Buffer.alloc(this.encodeSize());
    this.encodeTo(buffer, 0);
    return buffer;
  }

  encodeTo(buffer, offset) {
    offset = buffer.writeUInt8((0b01000000) | (this.subtype.code & 0b11111), offset);
    switch (this.subtype.code) {
      case SubtypeCodes.Schedule:
      case SubtypeCodes.FixedTag:
      case SubtypeCodes.ProductionInhibitTime:
        offset = buffer.writeUInt8(this.value, offset);
        break;
      default:
        throw new Error(`Network segment subtype ${this.subtype.name} not supported yet`);
    }

    return offset;
  }

  static Decode(buffer, offsetRef, segmentCode /* , padded */) {
    const subtype = getBits(segmentCode, 0, 5);

    let value;
    switch (subtype) {
      case SubtypeCodes.Schedule:
      case SubtypeCodes.FixedTag:
      case SubtypeCodes.ProductionInhibitTime:
        value = buffer.readUInt8(offsetRef.current); offsetRef.current += 1;
        break;
      case SubtypeCodes.Safety:
      case SubtypeCodes.Extended:
        /** variable */
        throw new Error(`Network segment subtype ${SubtypeNames[subtype]} not currently supported. TODO`);
      default:
        throw new Error(`Reserved Network segment subtype ${subtype}`);
    }

    return new NetworkSegment(subtype, value);
  }
}

NetworkSegment.SubtypeCodes = SubtypeCodes;
