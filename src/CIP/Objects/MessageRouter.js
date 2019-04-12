'use strict';

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
    res.service = buffer.readUInt8(offset); offset += 1;
    offset += 1; // reserved

    const statusCode = buffer.readUInt8(offset); offset += 1;

    res.status = {};
    res.status.code = statusCode;
    res.status.name = CIPGeneralStatusCodeNames[statusCode] || '';
    res.status.description = CIPGeneralStatusCodeDescriptions[statusCode] || '';

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


// CIP-V1-1.0 Appendix B-1. General status codes
const CIPGeneralStatusCodeNames = {
  0x01: 'Success',
  0x01: 'Connection failure',
  0x02: 'Resource unavailable',
  0x03: 'Invalid parameter value',
  0x04: 'Path segment error',
  0x05: 'Path destination unknown',
  0x06: 'Partial transfer',
  0x07: 'Connection lost',
  0x08: 'Service not supported',
  0x09: 'Invalid attribute value',
  0x0A: 'Attribute list error',
  0x0B: 'Already in requested mode/state',
  0x0C: 'Object state conflict',
  0x0D: 'Object already exists',
  0x0E: 'Attribute not settable',
  0x0F: 'Privilege violation',
  0x10: 'Device state conflict',
  0x11: 'Reply data too large',
  0x12: 'Fragmentation of a primitive value',
  0x13: 'Not enough data',
  0x14: 'Attribute not supported',
  0x15: 'Too much data',
  0x16: 'Objet does not exist',
  0x17: 'Service fragmentation sequence not in progress',
  0x18: 'No stored attribute data',
  0x19: 'Store operation failure',
  0x1A: 'Routing failure, request packet too large',
  0x1B: 'Routing failure, response packet too large',
  0x1C: 'Missing attribute list entry data',
  0x1D: 'Invalid attribute value list',
  0x1E: 'Embedded service error',
  0x1F: 'Vendor specific error',
  0x20: 'Invalid parameter',
  0x21: 'Write-once value or medium already written',
  0x22: 'Invalid Replay Received',
  0x25: 'Key Failure in path',
  0x26: 'Path Size Invalid',
  0x27: 'Unexpected attribute in list',
  0x28: 'Invalid member ID',
  0x29: 'Member not settable',
  0x2A: 'Group 2 only server general failure'
};

// CIP-V1-1.0 Appendix B-1. General status codes
const CIPGeneralStatusCodeDescriptions = {
  0x01: 'A connection related service failed along the connection path.',
  0x02: 'Resources needed for the object to perform the requested service were unavailable.',
  0x03: 'See Status Code 0x20, which is the preferred value to use for this condition.',
  0x04: 'The path segment identifier or the segment syntax was not understood by the processing node. Path processing shall stop when a path segment error is encountered.',
  0x05: 'The path is referencing an object class, instance or structure element that is not known or is not contained in the processing node. Path processing shall stop when a path destination unknown error is encountered.',
  0x06: 'Only part of the expected data was transferred.',
  0x07: 'The message connection was lost.',
  0x08: 'The requested service was not implemented or was not defined for this Object Class/Instance.',
  0x09: 'Invalid attribute data detected.',
  0x0A: 'An attribute in the Get_Attribute_List or Set_Attribute_List response has a non-zero status.',
  0x0B: 'The object is already in the mode/state being requested by the service.',
  0x0C: 'The object cannot perform the requested service in its current mode/state.',
  0x0D: 'The requested instance of object to be created already exists.',
  0x0E: 'A request to modify a non-modifiable attribute was received.',
  0x0F: 'A permission/privilege check failed.',
  0x10: 'The device’s current mode/state prohibits the execution of the requested service.',
  0x11: 'The data to be transmitted in the response buffer is larger than the allocated response buffer.',
  0x12: 'The service specified an operation that is going to fragment a primitive data value, i.e. half a REAL data type.',
  0x13: 'The service did not supply enough data to perform the specified operation.',
  0x14: 'The attribute specified in the request is not supported.',
  0x15: 'The service supplied more data than was expected.',
  0x16: 'The object specified does not exist in the device.',
  0x17: 'The fragmentation sequence for this service is not currently active for this data.',
  0x18: 'The attribute data of this object was not saved prior to the requested service.',
  0x19: 'The attribute data of this object was not saved due to a failure during the attempt.',
  0x1A: 'The service request packet was too large for transmission on a network in the path to the destination. The routing device was forced to abort the service.',
  0x1B: 'The service response packet was too large for transmission on a network in the path from the destination. The routing device was forced to abort the service.',
  0x1C: 'The service did not supply an attribute in a list of attributes that was needed by the service to perform the requested behaviour.',
  0x1D: 'The service is returning the list of attributes supplied with status information for those attributes that were invalid.',
  0x1E: 'An embedded service resulted in an error.',
  0x1F: 'A vendor specific error has been encountered. The Additional Code Field of the Error Response defines the particular error encountered. Use of this General Error Code should only be performed when none of the Error Codes presented in this table or within an Object Class definition accurately reflect the error.',
  0x20: 'A parameter associated with the request was invalid. This code is used when a parameter does not meet the requirements of this specification and/or the requirements defined in an Application Object Specification.',
  0x21: 'An attempt was made to write to a write-once medium (e.g. WORM drive, PROM) that has already been written, or to modify a value that cannot be changed once established.',
  0x22: 'An invalid reply is received (e.g. reply service code does not match the request service code, or reply message is shorter than the minimum expected reply size). This status code can serve for other causes of invalid replies.',
  0x25: 'The Key Segment that was included as the first segment in the path does not match the destination module. The object specific status shall indicate which part of the key check failed.',
  0x26: 'The size of the path which was sent with the Service Request is either not large enough to allow the Request to be routed to an object or too much routing data was included.',
  0x27: 'An attempt was made to set an attribute that is not able to be set at this time.',
  0x28: 'The Member ID specified in the request does not exist in the specified Class/Instance/Attribute.',
  0x29: 'A request to modify a non-modifiable member was received.',
  0x2A: 'This error code may only be reported by DeviceNet group 2 only servers with 4K or less code space and only in place of Service not supported, Attribute not supported and Attribute not settable.'
};

MessageRouter.StatusDescriptions = CIPGeneralStatusCodeNames;
