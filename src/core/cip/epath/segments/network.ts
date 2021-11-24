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
} from '../../../../utils';

import { Ref, CodedValue } from '../../../../types';

import Segment from '../segment';

export enum SubtypeCodes {
  Schedule = 1,
  FixedTag = 2,
  ProductionInhibitTime = 3,
  Safety = 16,
  Extended = 31,
};

export default class NetworkSegment implements Segment {
  subtype: CodedValue;
  value: number;

  constructor(subtype: number, value: number) {
    this.subtype = {
      code: subtype,
      description: SubtypeCodes[subtype] || 'Unknown',
    };
    this.value = value;
  }

  static SubtypeCodes = SubtypeCodes;

  encodeSize() {
    switch (this.subtype.code) {
      case SubtypeCodes.Schedule:
      case SubtypeCodes.FixedTag:
      case SubtypeCodes.ProductionInhibitTime:
        return 2;
      default:
        throw new Error(`Network segment subtype ${this.subtype.description} not supported yet`);
    }
  }

  encode() {
    const buffer = Buffer.alloc(this.encodeSize());
    this.encodeTo(buffer, 0);
    return buffer;
  }

  encodeTo(buffer: Buffer, offset: number) {
    offset = buffer.writeUInt8((0b01000000) | (this.subtype.code & 0b11111), offset);
    switch (this.subtype.code) {
      case SubtypeCodes.Schedule:
      case SubtypeCodes.FixedTag:
      case SubtypeCodes.ProductionInhibitTime:
        offset = buffer.writeUInt8(this.value, offset);
        break;
      default:
        throw new Error(`Network segment subtype ${this.subtype.description} not supported yet`);
    }

    return offset;
  }

  static Decode(buffer: Buffer, offsetRef: Ref, segmentCode: number /* , padded */) {
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
        throw new Error(`Network segment subtype ${SubtypeCodes[subtype]} not currently supported. TODO`);
      default:
        throw new Error(`Reserved Network segment subtype ${subtype}`);
    }

    return new NetworkSegment(subtype, value);
  }
}
