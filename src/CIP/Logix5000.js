'use strict';

const { getBit, getBits, Resolver } = require('../util');
const CIP = require('./Objects/CIP');
const Layer = require('../Stack/Layers/Layer');
const MessageRouter = require('./Objects/MessageRouter');

class Logix5000 extends Layer {
  readTag(address, callback) {
    return new Promise((resolve, reject) => {
      const resolver = Resolver(resolve, reject, callback);

      const BASE_ERROR = 'Logix5000 Error: Read Tag: ';

      if (!address) {
        return resolver.reject(`${BASE_ERROR}Address must be specified`);
      }

      const path = MessageRouter.ANSIExtSymbolSegment(address);
      const data = Buffer.from([0x01, 0x00]); // number of elements to read (1)

      const request = MessageRouter.Request(Services.ReadTag, path, data);

      this.send(request, null, false, this.contextCallback(function (message) {
        const reply = MessageRouter.Reply(message);

        if (reply.status.code !== 0) {
          if (READ_TAG_ERRORS[reply.status.code] != null) {
            reply.status.description = READ_TAG_ERRORS[reply.status.code];
          }
          resolver.reject(`${BASE_ERROR}${reply.status.description}`);
        } else {
          try {
            const dataType = reply.data.readUInt16LE(0);
            const dataConverter = DataConverters[dataType];
            if (dataConverter) {
              const value = dataConverter(reply.data, 2);
              resolver.resolve(value);
            } else {
              resolver.reject(`${BASE_ERROR}No converter for data type: ${dataType}`);
            }
          } catch(err) {
            resolver.reject(`${BASE_ERROR}${err.message}`);
          }
        }
      }));
    });
  }


  writeTag(address, value, callback) {
    const BASE_ERROR = 'Logix5000 Error: Write Tag: ';
    if (!address) {
      if (callback != null) {
        callback(`${BASE_ERROR}Address must be specified`);
      }
      return;
    }

    const path = MessageRouter.ANSIExtSymbolSegment(address);
    const data = Buffer.alloc(8);

    data.writeUInt16LE(CIP.DataType.REAL, 0);
    data.writeUInt16LE(1, 2);
    data.writeFloatLE(value, 4);

    const request = MessageRouter.Request(Services.WriteTag, path, data);

    this.send(request, null, false, this.contextCallback(function(message) {
      const reply = MessageRouter.Reply(message);
      if (callback != null) callback(null, reply);
    }));
  }


  readModifyWriteTag(address, ORmasks, ANDmasks, callback) {
    const BASE_ERROR = 'Logix5000 Error: Read Modify Write Tag: ';
    if (!address) {
      if (callback != null) {
        callback(`${BASE_ERROR}Address must be specified`);
      }
      return;
    }

    if (
      Array.isArray(ORmasks) === false && Buffer.isBuffer(ORmasks) === false
      || Array.isArray(ANDmasks) === false && Buffer.isBuffer(ANDmasks) === false
    ) {
      callback(`${BASE_ERROR}OR masks and AND masks must be either an array or a buffer`);
      return;
    }

    if (ORmasks.length !== ANDmasks.length) {
      callback(`${BASE_ERROR}Length of OR masks must be equal to length of AND masks`);
      return;
    }

    const sizeOfMasks = ORmasks.length;

    const ACCEPTABLE_SIZE_OF_MASKS = new Set([1, 2, 4, 8, 12]);

    if (ACCEPTABLE_SIZE_OF_MASKS.has(sizeOfMasks) === false) {
      if (callback != null) {
        callback(`${BASE_ERROR}Size of masks is not valid. Valid lengths are 1, 2, 4, 8, and 12`);
      }
    }

    for (let i = 0; i < sizeOfMasks; i++) {
      if (
        ORmasks[i] < 0 || ORmasks > 0xFF
        || ANDmasks[i] < 0 || ANDmasks > 0xFF
      ) {
        callback(`${BASE_ERROR}Values in masks must be greater than or equal to zero and less than or equal to 255`);
        return;
      }
    }

    const code = Services.ReadModifyWriteTag
    const path = MessageRouter.ANSIExtSymbolSegment(address);
    const data = Buffer.alloc(2 + 2 * sizeOfMasks);

    data.writeUInt16LE(sizeOfMasks, 0);

    for (let i = 0; i < sizeOfMasks; i++) {
      data.writeUInt8(ORmasks[i], 2 + i);
      data.writeUInt8(ANDmasks[i], 2 + sizeOfMasks + i);
    }

    const request = MessageRouter(code, path, data);

    this.send(request, null, false, this.contextCallback(function(message) {
      const reply = MessageRouter.Reply(message);
      if (callback != null) callback(null, reply);
    }));
  }

  supportedObjects(callback) {
    return new Promise((resolve, reject) => {
      const resolver = Resolver(resolve, reject, callback);

      const BASE_ERROR = 'Logix5000 Supported Objects Error: ';

      const path = Buffer.from([
        0x20, // Logical Segment - Class ID
        0x02, // Message Router class
        0x24, // Logical Segment - Instance ID 
        0x01, // Instance ID
        0x30, // Logical Segment - Attribute ID
        0x01  // Attribute 1
      ]);

      const request = MessageRouter.Request(CIP.Services.GetAttributeSingle, path);

      this.send(request, null, false, this.contextCallback(message => {
        try {
          const reply = MessageRouter.Reply(message);

          if (reply.status.code === 0) {
            const data = reply.data;
            const res = [];
            let offset = 0;

            const objectCount = data.readUInt16LE(offset); offset += 2;

            for (let i = 0; i < objectCount; i++) {
              const classID = data.readUInt16LE(offset); offset += 2;
              res.push({
                id: classID,
                name: CIP.ClassNames[classID] || 'Unknown'
              });
            }

            resolver.resolve(res);
          } else {
            resolver.reject(`${BASE_ERROR}${reply.status.description}`);
          }
        } catch (err) {
          resolver.reject(`${BASE_ERROR}${err.message}`);
        }
      }));
    });
  }


  identity(callback) {
    return new Promise((resolve, reject) => {
      const resolver = Resolver(resolve, reject, callback);

      const BASE_ERROR = 'Logix5000 Identity Error: ';

      const path = Buffer.from([
        0x20, // Logical Segment - Class ID
        0x01, // Identity class
        0x24, // Logical Segment - Instance ID 
        0x01  // Instance ID
      ]);

      const request = MessageRouter.Request(CIP.Services.GetAttributesAll, path);

      this.send(request, null, false, this.contextCallback(message => {
        try {
          const reply = MessageRouter.Reply(message);

          if (reply.status.code === 0) {
            const data = reply.data;
            const res = {};
            let offset = 0;
            res.vendorID = data.readUInt16LE(offset); offset += 2;
            res.deviceType = data.readUInt16LE(offset); offset += 2;
            res.productCode = data.readUInt16LE(offset); offset += 2;
            res.majorRevision = data.readUInt8(offset); offset += 1;
            res.minorRevision = data.readUInt8(offset); offset += 1;
            res.status = data.readUInt16LE(offset); offset += 2;
            res.serialNumber = data.readInt32LE(offset); offset += 4;
            const nameLength = data.readUInt8(offset); offset += 1;
            res.productName = data.toString('ascii', offset, offset + nameLength); offset += nameLength;
            // res.state = data.readUInt8(offset); offset += 1;
            // res.configurationConsistency = data.readUInt8(offset); offset + 1;
            // res.heartbeatInterval = data.readUInt8(offset); offset + 1;

            resolver.resolve(res);
          } else {
            resolver.reject(`${BASE_ERROR}${reply.status.description}`);
          }
        } catch (err) {
          resolver.reject(`${BASE_ERROR}${err.message}`);
        }
      }));
    });
  }


  listTags(callback, startInstanceID = 0) {
    if (callback == null) return;

    const BASE_ERROR = 'Logix5000 Error: List Tags: ';

    const path = Buffer.from([
      0x20, // Logical Segment - Class ID
      0x6B, // Symbols
      0x25, // Logical Segment - Instance ID
      0x00,
      0x00,
      0x00
    ]);

    path.writeUInt16LE(startInstanceID, 4);

    const attributes = [
      0x01, // Attribute 1 - Symbol Name
      0x02  // Attribute 2 - Symbol Type
    ];

    const data = Buffer.alloc(2 + attributes.length * 2);
    data.writeUInt16LE(attributes.length, 0);
    for (let i = 0; i < attributes.length; i++) {
      data.writeUInt16LE(attributes[i], 2 * (i + 1));
    }

    const request = MessageRouter.Request(Classes.Symbol.Services.GetInstanceAttributeList, path, data);

    this.send(request, null, false, this.contextCallback(message => {
      const reply = MessageRouter.Reply(message);

      const done = reply.status.code === 0;

      if (!done && reply.status.code !== 6) {
        return callback(`${BASE_ERROR}${reply.status.description}`);
      }

      const tags = parseListTagsResponse(reply, attributes);

      const shouldContinue = callback(null, tags, done);

      if (!done && shouldContinue === true && tags.length > 0) {
        setImmediate(() => this.listTags(callback, tags[tags.length - 1].id + 1));
      }
    }));
  }


  readTemplateInstanceAttributes(templateID, callback) {
    return new Promise((resolve, reject) => {
      const resolver = Resolver(resolve, reject, callback);

      const BASE_ERROR = 'Logix5000 Error: Read Template Instance Attributes: ';

      const path = Buffer.from([
        0x20, // Logical Segment - Class ID
        Classes.Template.Code,
        0x25, // Logical Segment - Instance ID
        0x00,
        0x00,
        0x00
      ]);

      path.writeUInt16LE(templateID, 4);

      const attributes = [
        0x01, // Attribute 1 - (UINT) CRC for the members of the structure
        0x02, // Attribute 2 - (UINT) Number of structure members
        0x04, // Attribute 4 - (UDINT) Number of 32-bit words
        0x05  // Attribute 5 - (UDINT) Number of bytes of the structure data
      ];

      const data = Buffer.alloc(2 + attributes.length * 2);
      data.writeUInt16LE(attributes.length, 0);
      for (let i = 0; i < attributes.length; i++) {
        data.writeUInt16LE(attributes[i], 2 * (i + 1));
      }

      const request = MessageRouter.Request(Classes.Template.Services.GetAttributeList, path, data);

      this.send(request, null, false, this.contextCallback(message => {
        const reply = MessageRouter.Reply(message);

        if (reply.status.code !== 0) {
          resolver.reject(`${BASE_ERROR}${reply.status.description}`);
        } else {
          try {
            const template = parseReadTemplateInstanceAttributes(reply);
            resolver.resolve(template);
          } catch(err) {
            resolver.reject(`${BASE_ERROR}${err.message}`);
          }
        }
      }));
    });
  }


  // readTemplate(templateID, callback) {
  //   if (!callback) return;

  //   const BASE_ERROR = 'Logix5000 Error: Read Template: ';

  //   this.readTemplateInstanceAttributes(templateID, function(err, templateAttributes) {
  //     if (err) {
  //       return callback(err);
  //     }

  //     const 
  //   });
  // }


  handleData(data, info, context) {
    if (context == null) {
      throw new Error('Logix5000 Error: Unhandled message, context should not be null');
    }

    const callback = this.getCallbackForContext(context);
    if (callback != null) {
      callback(data, info);
    }
  }
}

module.exports = Logix5000;


function parseListTagsResponse(reply, attributes) {
  const tags = [];

  const data = reply.data;
  const length = data.length;

  let offset = 0;
  
  while (offset < length) {
    const tag = {};

    tag.id = data.readUInt32LE(offset); offset += 4;

    for (let i = 0; i < attributes.length; i++) {
      switch (attributes[i]) {
        case 0x01:
          const symbolNameLength = data.readUInt16LE(offset); offset += 2;
          tag.name = data.toString('ascii', offset, offset + symbolNameLength); offset += symbolNameLength;
          break;
        case 0x02:
          const typeCode = data.readUInt16LE(offset); offset += 2;
          tag.type = parseSymbolType(typeCode);
          break;
        default:
          throw new Error(`Unknown attribute: ${attributes[i]}`);
          // break;
      }
    }

    if (tag.type.system !== true) {
      tags.push(tag);
    } 
  }

  return tags;
}


function parseSymbolType(code) {
  const res = {};

  res.system = !!getBit(code, 12);

  const atomic = getBit(code, 15) === 0;

  res.dimensions = getBits(code, 13, 15);

  res.structure = !atomic;

  if (atomic) {
    res.dataType = getBits(code, 0, 8);
    if (res.dataType === CIP.DataType.BOOL) {
      res.position = getBits(code, 8, 11);
    }
    res.dataTypeName = CIP.DataTypeName[res.dataType];
  } else {
    const templateID = getBits(code, 0, 12);
    res.template = {
      id: templateID
    };
  }

  return res;
}



function parseReadTemplateInstanceAttributes(reply) {
  const data = reply.data;

  let offset = 0;
  const attributeCount = data.readUInt16LE(offset); offset += 2;

  const template = {};

  let i = 0;

  while (i < attributeCount) {
    i++;

    let attribute = data.readUInt16LE(offset); offset += 2;
    let status = data.readUInt16LE(offset); offset += 2;

    if (status === 0) {
      switch (attribute) {
        case 0x01:
          template.crc = data.readUInt16LE(offset); offset += 2;
          break;
        case 0x02:
          template.memberCount = data.readUInt16LE(offset); offset += 2;
          break;
        case 0x04:
          template.definitionSize = data.readUInt32LE(offset); offset += 4;
          break;
        case 0x05:
          template.structureSize = data.readUInt32LE(offset); offset += 4;
          break;
        default:
          throw new Error(`Unknown attribute: ${attribute}`);
      }
    } else {
      if (!template.errors) {
        template.errors = [];
      }

      template.errors.push({
        attribute,
        code: status,
        description: READ_TAG_ERRORS[status]
      });
    }
  }

  return template;
}


// 1756-PM020, pg. 16
const Services = {
  ReadTag: 0x4C,
  ReadTagFragmented: 0x52,
  WriteTag: 0x4D,
  WriteTagFragmented: 0x53,
  ReadModifyWriteTag: 0x4E,

  MultipleServicePacket: 0x0A // used to combine multiple requests in one message frame
};


const DataConverters = {
  [CIP.DataType.BOOL]: function (buffer, offset, position) {
    return getBit(buffer.readUInt8(offset), position);
  },
  [CIP.DataType.SINT]: function (buffer, offset) {
    return buffer.readInt8(offset);
  },
  [CIP.DataType.INT]: function (buffer, offset) {
    return buffer.readInt16LE(offset);
  },
  [CIP.DataType.DINT]: function (buffer, offset) {
    return buffer.readInt32LE(offset);
  },
  [CIP.DataType.REAL]: function (buffer, offset) {
    return buffer.readFloatLE(offset);
  },
  [CIP.DataType.DWORD]: function (buffer, offset) {
    return buffer.readUInt32LE(offset);
  }
};


// CIP Logix5000 1756-PM020 Page 19, Read Tag Service Error Codes
const READ_TAG_ERRORS = {
  0x04: 'A syntax error was detected decoding the Request Path',
  0x05: 'Request Path destination unknown: Probably instance number is not present',
  0x06: 'Insufficient Packet Space: Not enough room in the response buffer for all the data',
  0x13: 'Insufficient Request Data: Data too short for expected parameters',
  0x26: 'The Request Path Size received was shorter or longer than expected',
  0xFF: 'General Error: Access beyond end of the object',

  0x0A: 'Attribute list error, generally attribute not supported. The status of the unsupported attribute will be 0x14',
  0x1C: 'Attribute List Shortage: The list of attribute numbers was too few for the number of attributes parameter'
};


const Classes = {
  /*
    When a tag is created, an instance of the symbol class is created inside the controller.
    The name of the tag is stored in attribute 1 of the instance.
    The data type of the tag is stored in attribute 2.
  */
  Symbol: {
    Code: 0x6B,
    Services: {
      /*
        Returns instance IDs for each created instance of the symbol class,
        along with a list of the attribute data associated with the requested attributes
      */
      GetInstanceAttributeList: 0x55
    }
  },
  Template: {
    Code: 0x6C,
    Services: {
      GetAttributeList: 0x03,
      Read: 0x4C
    },
    // ClassAttributes: {
    //   1: {
    //     // description: 'Tag Type Parameter used in Read/Write Tag service',
    //     description: 'CRC for the members of the structure',
    //     type: 'UINT'
    //   },
    //   2: {
    //     description: 'Number of structure members',
    //     type: 'UINT'
    //   },
    //   4: {
    //     description: 'Number of 32-bit words',
    //     type: 'UDINT'
    //   },
    //   5: {
    //     description: 'Number of bytes of the structure data',
    //     type: 'UDINT'
    //   }
    // }
  }
};


