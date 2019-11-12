'use strict';

const {
  ServiceNames,
  GeneralStatusCodeNames,
  GeneralStatusCodeDescriptions
} = require('./CIP');


class MessageRouter {
  static Request(service, path, data) {
    let offset = 0;

    const dataLength = data != null ? data.length : 0;

    const buffer = Buffer.alloc(2 + path.length + dataLength);
    buffer.writeUInt8(service, offset); offset += 1;
    buffer.writeUInt8(path.length / 2, offset); offset += 1;
    path.copy(buffer, offset); offset += path.length;
    
    if (Buffer.isBuffer(data)) {
      data.copy(buffer, offset); offset + dataLength;
    }

    return buffer;
  }


  static Reply(buffer) {
    let offset = 0;
    const res = {};
    res.buffer = Buffer.from(buffer);
    // res.service = buffer.readUInt8(offset); offset += 1;
    const service = buffer.readUInt8(offset) & 0x7F; offset += 1;
    
    res.service = {
      code: service,
      name: ServiceNames[service] || 'Unknown'
    };

    offset += 1; // reserved

    const statusCode = buffer.readUInt8(offset); offset += 1;

    res.status = {};
    res.status.code = statusCode;
    res.status.name = GeneralStatusCodeNames[statusCode] || '';
    res.status.description = GeneralStatusCodeDescriptions[statusCode] || '';
    res.status.error = statusCode !== 0 && statusCode !== 6;

    const additionalStatusSize = buffer.readUInt8(offset); offset += 1; // number of 16 bit words
    if (additionalStatusSize > 0) {
      res.status.additional = buffer.slice(offset, offset + 2 * additionalStatusSize);
      offset += 2 * additionalStatusSize;
    }

    res.data = buffer.slice(offset);
    return res;
  }

  // tagname
  // tagname.member
  // tagname[element]
  // tagname[element].member
  // tagname[idx1,idx2]

  // CIP Vol 1 Appendix C-1.4.5.2
  static ANSIExtSymbolSegment(address) {
    let offset = 0;
    const buffer = Buffer.alloc(256);

    const items = address.split('.');

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const items2 = item.split('[');

      let tagname = items2[0];
      let tagnameLength = tagname.length;

      buffer.writeUInt8(0x91, offset); offset += 1;
      buffer.writeUInt8(tagnameLength, offset); offset += 1;

      for (let j = 0; j < tagnameLength; j++) {
        buffer.writeUInt8(tagname.charCodeAt(j), offset); offset += 1;
      }

      offset += tagnameLength % 2 === 1 ? 1 : 0;

      if (items2.length > 1) {
        let elements = items2[1];
        elements = elements.substring(0, elements.length - 1);
        elements = elements.split(',');

        for (let j = 0; j < elements.length; j++) {
          const element = parseInt(elements[j], 16);

          if (!isNaN(element)) {
            if (element <= 0xFF) {
              buffer.writeUInt8(0x28, offset); offset += 1;
              buffer.writeUInt8(element, offset); offset += 1;
            } else if (element <= 0xFFFF) {
              buffer.writeUInt8(0x29, offset); offset += 2;
              buffer.writeUInt16LE(element, offset); offset += 2;
            } else {
              buffer.writeUInt8(0x30, offset); offset += 2;
              buffer.writeUInt32LE(element, offset); offset += 4;
            }
          } else {
            throw new Error('Element is not an integer: ' + address);
          }
        }
      }
    }

    return buffer.slice(0, offset);
  }


  static Segments(buffer) {
    let offset = 0;
    let length = buffer.length;
    let segments = [];

    let count = 0;

    while (offset < length) {
      count++;
      if (count > 100) throw new Error('Infinite loop');

      let segmentType = utils.getBits(buffer[offset], 5, 8);
      let segment = null;
      switch (segmentType) {
        case 0:
          offset += PortSegment(buffer, offset, segments);
          break;
        case 1:
          offset += LogicalSegment(buffer, offset, segments);
          break;
        case 2:
          offset += NetworkSegment(buffer, offset, segments);
          break;
        case 3:
          offset += SymbolicSegment(buffer, offset, segments);
          break;
        case 4:
          offset += DataSegment(buffer, offset, segments);
          break;
        case 5:
          // DataType constructed (EIP-CIP V1 Appendix C-2.2)
          break;
        case 6:
          // DataType elementary (EIP-CIP V1 Appendix C-2.1)
          break;
        default:
          throw new Error('Segment type not recognized');
      }
      segments.push(segment);
    }
    return segments;
  }
}

module.exports = MessageRouter;

MessageRouter.Code = 0x02;


// Data Segment - 0b100XXXXX
//    Simple Data Segment, 0x80, 0b10000000
//    ASNI Extended Symbol Segment, 0x91, 0b10010001

const Segments = {
  LogicalSegmentMemberID: 0x28,
  LogicalSegmentMemberLong: 0x29
};




function PortSegment(buffer, offset, segments) {
  // used for routing from one subnet to another
  let originalOffset = offset;
  // let length = 1;
  let extendedLinkAddressSize = utils.getBit(buffer[offset], 4);
  let portIdentifier = utils.getBits(buffer[offset], 0, 4);
  let linkAddress = null;
  let linkAddressSize = 0;
  offset += 1;

  if (extendedLinkAddressSize) {
    linkAddressSize = buffer[offset]; offset += 1;
  } else {
    linkAddressSize = 1;
  }

  if (portIdentifier === 15) {
    portIdentifier = buffer.readUInt16LE(offset); offset += 2;
  }

  linkAddress = buffer.slice(offset, offset + linkAddressSize);

  offset += linkAddressSize;

  offset = (offset - originalOffset) % 2 === 0 ? offset : offset + 1;

  segments.push({
    Type: CIPSegmentType.PortSegment,
    Port: portIdentifier,
    Address: linkAddress
  });

  return offset - originalOffset;
}

function LogicalSegment(buffer, offset, segments) {
  // logical reference information (such as class/instance/attribute IDs)
  let originalOffset = 0;
  let logicalType = utils.getBits(buffer[offset], 2, 5);
  let logicalFormat = utils.getBits(buffer[offset], 0, 2);

  // 8bit - all
  // 16bit - ClassID, InstanceID, MemberID, ConnectionPoint
  // 32bit - not allowed, reserved for future use



  return offset - originalOffset;
}

function NetworkSegment(buffer, offset, segments) {

}

function SymbolicSegment(buffer, offset, segments) {
  // symbolic name
}

function DataSegment(buffer, offset, segments) {
  // embedded data (such as configuration data)
}
