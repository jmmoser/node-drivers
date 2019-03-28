'use strict';

const util = require('../util');
const Layer = require('./../Stack/Layers/Layer');
const MessageRouter = require('./Objects/MessageRouter');
const ElementaryDataTypes = require('./Objects/constants/ElementaryDataTypeCodes');

class ControlLogix extends Layer {
  readTag(address, callback) {
    if (callback == null) return;

    const BASE_ERROR = 'ControlLogix Error: Read Tag: ';

    if (!address) {
      callback(`${BASE_ERROR}Address must be specified`);
      return;
    }

    const path = MessageRouter.ANSIExtSymbolSegment(address);
    const data = Buffer.from([0x01, 0x00]); // number of elements to read (1)

    const request = MessageRouter.Request(Services.ReadTag, path, data);

    this.send(request, null, false, this.contextCallback(function(message) {
      const reply = MessageRouter.Reply(message);

      if (reply.status.code !== 0) {
        if (READ_TAG_ERRORS[reply.status.code] != null) {
          reply.status.description = READ_TAG_ERRORS[reply.status.code];
        }
        callback(`${BASE_ERROR}${reply.status.description}`);
        return;
      }

      const dataType = reply.data.readUInt16LE(0);
      const dataConverter = DataConverters[dataType];
      if (dataConverter) {
        callback(null, dataConverter(reply.data, 2));
      } else {
        callback(`${BASE_ERROR}No converter for data type: ${dataType}`);
      }
    }));
  }

  writeTag(address, value, callback) {
    const BASE_ERROR = 'ControlLogix Error: Write Tag: ';
    if (!address) {
      if (callback != null) {
        callback(`${BASE_ERROR}Address must be specified`);
      }
      return;
    }

    const path = MessageRouter.ANSIExtSymbolSegment(address);
    const data = Buffer.alloc(8);
    data.writeUInt16LE(DataTypes.Float, 0);
    data.writeUInt16LE(1, 2);
    data.writeFloatLE(value, 4);

    const request = MessageRouter.Request(Services.WriteTag, path, data);

    this.send(request, null, false, this.contextCallback(function(message) {
      const reply = MessageRouter.Reply(message);
      if (callback != null) callback(null, reply);
    }));
  }

  readModifyWriteTag(address, ORmasks, ANDmasks, callback) {
    const BASE_ERROR = 'ControlLogix Error: Read Modify Write Tag: ';
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

    const ACCEPTABLE_SIZE_OF_MASKS = new Set([1,2,4,8,12]);

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


  listTags(callback, startInstanceID = 0) {
    if (callback == null) return;

    const BASE_ERROR = 'ControlLogix Error: List Tags: ';

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
      // console.log(reply);

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

  handleData(data, info, context) {
    if (context == null) {
      throw new Error('ControlLogix Error: Unhandled message, context should not be null');
    }

    const callback = this.getCallbackForContext(context);
    if (callback != null) {
      callback(data, info);
    }
  }
}

module.exports = ControlLogix;

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
          tag.type = parseSymbolType(data.readUInt16LE(offset)); offset += 2;
          break;
        default:
          throw new Error(`Unknown attribute: ${attributes[i]}`);
          // break;
      }
    }

    tags.push(tag);
  }

  return tags;
}


function parseSymbolType(code) {
  const res = {
    code
  };

  if (util.getBit(code, 12)) {
    res.system = true;
    res.type = 'system';
    return res;
  }

  const atomic = util.getBit(code, 15);

  res.type = atomic ? 'atomic' : 'structure';

  if (atomic) {
    const section1 = util.getBits(code, 0, 8);
    if (section1 === ElementaryDataTypes.DataType.BOOL) {
      res.dataType = section1;
      res.position = util.getBits(code, 8, 11);
    } else {
      res.dataType = util.getBits(code, 0, 12);
    }
    // res.hex = `0x${Buffer.from([res.dataType]).toString('hex').toUpperCase()}`;
    res.dataTypeName = ElementaryDataTypes.DataTypeNames[section1];

  } else {
    res.template = util.getBits(code, 0, 12);
  }

  return res;
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

const DataTypes = {
  Bool: 0xC1,
  Char: 0xC2,
  Short: 0xC3,
  Integer: 0xC4,
  Float: 0xCA,
  UnsignedInteger: 0xD3
};

// const DataTypeNames = {
//   [DataTypes.Bool]: 'bool',
//   [DataTypes.Char]: 'char',
//   [DataTypes.Short]: 'short',
//   [DataTypes.Integer]: 'integer',
//   [DataTypes.Float]: 'float',
//   [DataTypes.UnsignedInteger]: 'unsigned integer'
// };

const DataConverters = {
  0x00C1: function(buffer, offset) {
    return !!buffer.readUInt8(offset);
  },
  0x00C2: function(buffer, offset) {
    return buffer.readInt8(offset);
  },
  0x00C3: function(buffer, offset) {
    return buffer.readInt16LE(offset);
  },
  0x00C4: function(buffer, offset) {
    return buffer.readInt32LE(offset);
  },
  0x00CA: function(buffer, offset) {
    return buffer.readFloatLE(offset);
  },
  0x00D3: function(buffer, offset) {
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
  0xFF: 'General Error: Access beyond end of the object'
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
      GetAttributeList: 0x03
    },
    ClassAttributes: {
      1: {
        description: 'Tag Type Parameter used in Read/Write Tag service',
        type: 'UINT'
      },
      2: {
        description: 'Number of structure members',
        type: 'UINT'
      },
      3: {
        description: 'Number of 32-bit words',
        type: 'UDINT'
      },
      4: {
        description: 'Number of bytes of the structure data',
        type: 'UDINT'
      }
    }
  }
};