import {
  InvertKeyValues,
} from '../../../utils';

/** CIP Vol1 Appendix A */
export const CommonServiceCodes = Object.freeze({
  GetAttributesAll: 0x01,
  SetAttributesAll: 0x02,
  GetAttributeList: 0x03,
  SetAttributeList: 0x04,
  Reset: 0x05,
  Start: 0x06,
  Stop: 0x07,
  Create: 0x08,
  Delete: 0x09,
  MultipleServicePacket: 0x0A, /** CIP Vol 1, A-4.10.2 */
  ApplyAttributes: 0x0D,
  GetAttributeSingle: 0x0E,
  SetAttributeSingle: 0x10,
  FindNextObjectInstance: 0x11,
  Restore: 0x15,
  Save: 0x16,
  NoOperation: 0x17,
  GetMember: 0x18,
  SetMember: 0x19,
  InsertMember: 0x1A,
  RemoveMember: 0x1B,
  GroupSync: 0x1C,
});

export const CommonServiceNames = InvertKeyValues(CommonServiceCodes);
