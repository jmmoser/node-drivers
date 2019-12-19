'use strict';

const {
  Decode,
  DataType,
  ClassNames,
  CommonServiceNames,
  GeneralStatusCodeNames,
  GeneralStatusCodeDescriptions
} = require('./CIP');


class MessageRouter {
  static Request(service, path, data) {
    let offset = 0;

    const dataIsBuffer = Buffer.isBuffer(data)
    const dataLength = dataIsBuffer ? data.length : 0;

    const buffer = Buffer.allocUnsafe(2 + path.length + dataLength);
    offset = buffer.writeUInt8(service, offset);
    offset = buffer.writeUInt8(path.length / 2, offset);
    offset += path.copy(buffer, offset);
    
    if (dataIsBuffer) {
      offset += data.copy(buffer, offset);
    }

    return buffer;
  }


  static Reply(buffer) {
    let offset = 0;
    const res = {};
    res.buffer = buffer;
    // res.buffer = Buffer.from(buffer);
    // res.service = buffer.readUInt8(offset); offset += 1;
    const service = buffer.readUInt8(offset) & 0x7F; offset += 1;
    
    res.service = {
      code: service,
      hex: `0x${service.toString(16)}`,
      name: CommonServiceNames[service] || 'Unknown'
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

  static DecodeSupportedObjects(data, offset, cb) {
    // const objectCount = data.readUInt16LE(offset); offset += 2;
    let objectCount;
    offset = Decode(DataType.UINT, data, offset, val => objectCount = val);

    const classes = [];
    for (let i = 0; i < objectCount; i++) {
      offset = Decode(DataType.UINT, data, offset, val => classes.push(val));
    }

    cb(classes.sort(function (o1, o2) {
      if (o1 < o2) return -1;
      else if (o1 > o2) return 1;
      return 0;
    }).map(classCode => ({
      code: classCode,
      name: ClassNames[classCode] || 'Unknown'
    })));

    return offset;
  }


  static DecodeGetClassAttributesAll(data, offset, cb) {
    const info = {};
    info.data = data;
    const length = data.length;

    if (offset < length) {
      offset = Decode(DataType.UINT, data, offset, val => info.revision = val);
    }

    if (offset < length) {
      offset = Decode(DataType.UINT, data, offset, val => info.maxInstanceID = val);
    }

    if (offset < length) {
      offset = Decode(DataType.UINT, data, offset, val => info.numberOfInstances = val);
    }

    if (offset < length) {
      let numberOfOptionalAttributes;
      offset = Decode(DataType.UINT, data, offset, val => numberOfOptionalAttributes = val);
      console.log({
        numberOfOptionalAttributes
      });

      info.optionalAttributes = [];
      for (let i = 0; i < numberOfOptionalAttributes; i++) {
        if (offset < length) {
          offset = Decode(DataType.UINT, data, offset, val => info.optionalAttributes.push(val));
        } else {
          console.log('breaking optional attributes');
          break;
        }
      }

      console.log({
        numberOfOptionalAttributes,
        length: info.optionalAttributes.length
      })
    }

    if (offset < length) {
      let numberOfOptionalServices;
      offset = Decode(DataType.UINT, data, offset, val => numberOfOptionalServices = val);

      info.optionalServices = [];
      for (let i = 0; i < numberOfOptionalServices; i++) {
        if (offset < length) {
          offset = Decode(DataType.UINT, data, offset, val => info.optionalServices.push({
            code: val,
            name: CommonServiceNames[val] || 'Unknown',
            hex: `0x${val.toString('16')}`
          }));
        } else {
          console.log('breaking optional services');
          break;
        }
      }

      // console.log({
      //   numberOfOptionalServices,
      //   length: info.optionalServices.length
      // })
    }

    if (offset < length) {
      offset = Decode(DataType.UINT, data, offset, val => info.maxIDNumberOfClassAttributes = val);
    }

    if (offset < length) {
      offset = Decode(DataType.UINT, data, offset, val => info.maxIDNumberOfInstanceAttributes = val);
    }

    info.extra = data.slice(offset);

    cb(info);

    // console.log(data.readUInt16LE(length - 4));
    // console.log(data.readUInt16LE(length - 2));
    // console.log(data.slice(length - 8));

    return offset;
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
