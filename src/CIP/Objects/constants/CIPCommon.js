'use strict';

// CIP Vol1 Appendix A
const Services = {
  GetAttributesAll: 0x01,
  SetAttributesAll: 0x02,
  GetAttributeList: 0x03,
  SetAttributeList: 0x04,
  Reset: 0x05,
  Start: 0x06,
  Stop: 0x07,
  Create: 0x08,
  Delete: 0x09,
  MultipleServicePacket: 0x0A,
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
  GroupSync: 0x1C
};

// CIP Vol1 Table 4-4.2
const ReservedClassAttributes = {
  Revision: 1,
  MaxInstance: 2,
  NumberOfInstances: 3,
  OptionalAttributeList: 4,
  OptionalServiceList: 5,
  MaximumIDNumberClassAttributes: 6,
  MaximumIDNumberInstanceAttributes: 7
};

module.exports = {
  Services,
  ReservedClassAttributes
};
