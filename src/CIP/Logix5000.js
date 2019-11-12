'use strict';

const { getBit, getBits, CallbackPromise } = require('../util');
const { DataTypes, DataTypeNames, EncodeValue, DecodeValue } = require('./Objects/CIP');
const CIPLayer = require('./Objects/CIPLayer');
const { ANSIExtSymbolSegment } = require('./Objects/MessageRouter');
const ConnectionLayer = require('./Objects/Connection');


class Logix5000 extends CIPLayer {
  constructor(lowerLayer) {
    if (!(lowerLayer instanceof ConnectionLayer)) {
      /* Inject Connection as lower layer */
      lowerLayer = new ConnectionLayer(lowerLayer);
    }
    super(lowerLayer);
    this._tagIDtoDataType = new Map();
  }

  readTag(address, number, callback) {
    if (callback == null && typeof number === 'function') {
      callback = number;
      number = 1;
    }

    if (number == null || typeof number !== 'number') {
      number = 1;
    }

    return CallbackPromise(callback, resolver => {
      if (!address) {
        return resolver.reject('Address must be specified');
      }

      number = parseInt(number, 10);
      if (number > 0xFFFF) {
        return resolver.reject('Too many elements to read');
      }
      if (number <= 0) {
        return resolver.reject('Not enough elements to read');
      }

      const path = ANSIExtSymbolSegment(address);
      // const data = Buffer.from([0x01, 0x00]); // number of elements to read (1)
      const data = Buffer.alloc(2);
      data.writeUInt16LE(number, 0);

      send(this, Services.ReadTag, path, data, (error, reply) => {
        if (error) {
          resolver.reject(error, reply);
        } else {
          try {
            const dataType = reply.data.readUInt16LE(0);
            this._tagIDtoDataType.set(address, dataType);

            let offset = 2;
            const values = [];
            let decodeError;
            for (let i = 0; i < number; i++) {
              offset = DecodeValue(dataType, reply.data, offset, (err, value) => {
                if (err) {
                  decodeError = err;
                } else {
                  values.push(value);
                }
              });
              if (decodeError) {
                break;
              }
            }

            if (decodeError) {
              resolver.reject(decodeError, reply);
            } else {
              if (number === 1) {
                resolver.resolve(values[0]);
              } else {
                resolver.resolve(values);
              }
            }
          } catch (err) {
            console.log(err)
            resolver.reject(err.message, reply);
          }
        }
      });
    });
  }


  writeTag(address, value, callback) {
    return CallbackPromise(callback, async resolver => {
      if (!address) {
        return resolver.reject('Address must be specified');
      }

      if (!this._tagIDtoDataType.has(address)) {
        await this.readTag(address);
        if (!this._tagIDtoDataType.has(address)) {
          return resolver.reject('Unable to determine data type');
        }
      }

      const dataType = this._tagIDtoDataType.get(address);

      const valueData = EncodeValue(dataType, value);

      if (!Buffer.isBuffer(valueData)) {
        return resolver.reject(`Unable to encode data type: ${DataTypeNames[dataType] || dataType}`);
      }

      const path = ANSIExtSymbolSegment(address);

      const data = Buffer.alloc(4 + valueData.length);
      data.writeUInt16LE(dataType, 0);
      data.writeUInt16LE(1, 2);
      valueData.copy(data, 4);

      send(this, Services.WriteTag, path, data, (error, reply) => {
        if (error) {
          resolver.reject(error, reply);
        } else {
          resolver.resolve();
        }
      });
    });
  }


  readModifyWriteTag(address, ORmasks, ANDmasks, callback) {
    return CallbackPromise(callback, resolver => {
      if (!address) {
        return resolver.reject('Address must be specified');
      }

      if (
        !Array.isArray(ORmasks) && !Buffer.isBuffer(ORmasks)
        || !Array.isArray(ANDmasks) && !Buffer.isBuffer(ANDmasks)
      ) {
        return resolver.reject('OR masks and AND masks must be either an array or a buffer');
      }

      if (ORmasks.length !== ANDmasks.length) {
        return resolver.reject('Length of OR masks must be equal to length of AND masks');
      }

      const sizeOfMasks = ORmasks.length;

      if ((new Set([1, 2, 4, 8, 12])).has(sizeOfMasks) === false) {
        return resolver.reject('Size of masks is not valid. Valid lengths are 1, 2, 4, 8, and 12');
      }

      for (let i = 0; i < sizeOfMasks; i++) {
        if (ORmasks[i] < 0 || ORmasks > 0xFF || ANDmasks[i] < 0 || ANDmasks > 0xFF) {
          return resolver.reject('Values in masks must be greater than or equal to zero and less than or equal to 255');
        }
      }

      const path = ANSIExtSymbolSegment(address);

      const data = Buffer.alloc(2 + 2 * sizeOfMasks);
      data.writeUInt16LE(sizeOfMasks, 0);
      for (let i = 0; i < sizeOfMasks; i++) {
        data.writeUInt8(ORmasks[i], 2 + i);
        data.writeUInt8(ANDmasks[i], 2 + sizeOfMasks + i);
      }

      send(this, Services.ReadModifyWriteTag, path, data, (error, reply) => {
        if (error) {
          resolver.resolve(error, reply);
        } else {
          resolver.resolve();
        }
      });
    });
  }
  

  async* listTags(options) {
    const {
      timeout,
      instanceID
    } = Object.assign({
      timeout: 30000,
      instance: 0
    }, options);

    // const timeout = (options || {}).timeout;
    // let instanceID = (options || {}).instanceID || 0;

    if (instanceID >= 0xFFFF) {
      throw new Error('MAX INSTANCE ID');
    }

    const path = Buffer.from([
      0x20, // Logical Segment - Class ID
      0x6B, // Symbols
      0x25, // Logical Segment - Instance ID
      0x00,
      0x00,
      0x00
    ]);

    while(true) {
      path.writeUInt16LE(instanceID, 4);

      const attributes = [
        0x01, // Attribute 1 - Symbol Name
        0x02  // Attribute 2 - Symbol Type
      ];

      const data = Buffer.alloc(2 + attributes.length * 2);
      data.writeUInt16LE(attributes.length, 0);
      for (let i = 0; i < attributes.length; i++) {
        data.writeUInt16LE(attributes[i], 2 * (i + 1));
      }

      const reply = await sendPromise(this, Classes.Symbol.Services.GetInstanceAttributeList, path, data, timeout);

      const tags = [];
      const lastInstanceID = parseListTagsResponse(reply, attributes, tags);

      for (let i = 0; i < tags.length; i++) {
        // const tag = tags[i];
        // if (tag.type.system !== true) {
        //   if (tag.type.structure === true) {
        //     console.log(await this.readTemplateInstanceAttributes(tag.type.template.id));
        //   }
        //   yield tags[i];
        // }
        yield tags[i];
      }

      if (reply.status.code === 0 || tags.length <= 0) {
        break;
      }

      instanceID = lastInstanceID + 1;
    }
  }

  // listTags(options, callback) {
  //   if (typeof options === 'function') {
  //     callback = options;
  //   }
  //   if (options == null || typeof options !== 'object') {
  //     options = {};
  //   }
  //   if (options.timeout == null) {
  //     options.timeout = 10000;
  //   }
  //   return CallbackPromise(callback, resolver => {
  //     internalListTags(this, options, [], 0, resolver);
  //   });
  // }

  readTemplate(template, callback) {
    return CallbackPromise(callback, resolver => {
      const path = Buffer.from([
        0x20, // Logical Segment - Class ID
        Classes.Template.Code,
        0x25, // Logical Segment - Instance ID
        0x00,
        0x00,
        0x00
      ]);

      const data = Buffer.alloc(6);
      data.writeUInt32LE(0, 0);
      data.writeUInt16LE(0x61, 4);

      send(this, Classes.Template.Services.Read, path, data, (error, reply) => {
        if (error) {
          resolver.reject(error, reply);
        } else {
          try {
            // const template = parseReadTemplateInstanceAttributes(reply);
            resolver.resolve(template);
          } catch (err) {
            resolver.reject(err.message, reply);
          }
        }
      });
    });
  }

  readTemplateInstanceAttributes(templateID, callback) {
    return CallbackPromise(callback, resolver => {
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

      send(this, Classes.Template.Services.GetAttributeList, path, data, (error, reply) => {
        if (error) {
          resolver.reject(error, reply);
        } else {
          try {
            const template = parseReadTemplateInstanceAttributes(reply);
            resolver.resolve(template);
          } catch (err) {
            resolver.reject(err.message, reply);
          }
        }
      });
    });
  }


  // readTemplate(templateID, callback) {
  //   if (!callback) return;

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

    const callback = this.callbackForContext(context);
    if (callback != null) {
      callback(null, data, info);
    }
  }
}

module.exports = Logix5000;


function sendPromise(self, service, path, data, timeout) {
  return new Promise((resolve, reject) => {
    send(self, service, path, data, (err, reply) => {
      if (err) {
        reject(err);
      } else {
        resolve(reply);
      }
    }, timeout);
  });
}

/** Use driver specific error handling if exists */
function send(self, service, path, data, callback, timeout) {
  return CIPLayer.send(self, true, service, path, data, (error, reply) => {
    callback(error ? getError(reply) : null, reply);
  }, timeout);
}

// async function* internalListTags(self, options, tags, instanceID, resolver) {
//   if (instanceID >= 0xFFFF) {
//     console.log('MAX INSTANCE ID');
//     return resolver.resolve(tags);
//   }

//   const path = Buffer.from([
//     0x20, // Logical Segment - Class ID
//     0x6B, // Symbols
//     0x25, // Logical Segment - Instance ID
//     0x00,
//     0x00,
//     0x00
//   ]);

//   path.writeUInt16LE(instanceID, 4);

//   const attributes = [
//     0x01, // Attribute 1 - Symbol Name
//     0x02  // Attribute 2 - Symbol Type
//   ];

//   const data = Buffer.alloc(2 + attributes.length * 2);
//   data.writeUInt16LE(attributes.length, 0);
//   for (let i = 0; i < attributes.length; i++) {
//     data.writeUInt16LE(attributes[i], 2 * (i + 1));
//   }

//   send(self, Classes.Symbol.Services.GetInstanceAttributeList, path, data, (error, reply) => {
//     if (error) {
//       if (tags.length === 0) {
//         resolver.reject(error, reply);
//       } else {
//         resolver.resolve(tags);
//       }
//     } else {
//       const done = reply.status.code === 0;

//       const lastInstanceID = parseListTagsResponse(reply, attributes, tags);

//       if (!done) {
//         setImmediate(() => internalListTags(self, options, tags, lastInstanceID + 1, resolver));
//       } else {
//         resolver.resolve(tags);
//       }
//     }
//   }, options.timeout);
// }

// function internalListTags(self, options, tags, instanceID, resolver) {
//   if (instanceID >= 0xFFFF) {
//     console.log('MAX INSTANCE ID');
//     return resolver.resolve(tags);
//   }

//   const path = Buffer.from([
//     0x20, // Logical Segment - Class ID
//     0x6B, // Symbols
//     0x25, // Logical Segment - Instance ID
//     0x00,
//     0x00,
//     0x00
//   ]);

//   path.writeUInt16LE(instanceID, 4);

//   const attributes = [
//     0x01, // Attribute 1 - Symbol Name
//     0x02  // Attribute 2 - Symbol Type
//   ];

//   const data = Buffer.alloc(2 + attributes.length * 2);
//   data.writeUInt16LE(attributes.length, 0);
//   for (let i = 0; i < attributes.length; i++) {
//     data.writeUInt16LE(attributes[i], 2 * (i + 1));
//   }

//   send(self, Classes.Symbol.Services.GetInstanceAttributeList, path, data, (error, reply) => {
//     if (error) {
//       if (tags.length === 0) {
//         resolver.reject(error, reply);
//       } else {
//         resolver.resolve(tags);
//       }
//     } else {
//       const done = reply.status.code === 0;

//       const lastInstanceID = parseListTagsResponse(reply, attributes, tags);

//       if (!done) {
//         setImmediate(() => internalListTags(self, options, tags, lastInstanceID + 1, resolver));
//       } else {
//         resolver.resolve(tags);
//       }
//     }
//   }, options.timeout);
// }


function parseListTagsResponse(reply, attributes, tags) {
  const data = reply.data;
  const length = data.length;

  let offset = 0;
  let lastInstanceID = 0;

  while (offset < length) {
    const tag = {};

    tag.id = data.readUInt32LE(offset); offset += 4;
    lastInstanceID = tag.id;

    for (let i = 0; i < attributes.length; i++) {
      switch (attributes[i]) {
        case 0x01:
          offset = DecodeValue(DataTypes.STRING, data, offset, (_, value) => {
            tag.name = value;
          });
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

  return lastInstanceID;
}


function parseSymbolType(code) {
  const res = {};
  const atomic = getBit(code, 15) === 0;
  res.system = !!getBit(code, 12);
  res.dimensions = getBits(code, 13, 15);
  res.structure = !atomic;

  if (atomic) {
    res.dataType = getBits(code, 0, 8);
    if (res.dataType === DataTypes.BOOL) {
      res.position = getBits(code, 8, 11);
    }
    res.dataTypeName = DataTypeNames[res.dataType] || 'UNKNOWN';
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

  for (let i = 0; i < attributeCount; i++) {
    const attribute = data.readUInt16LE(offset); offset += 2;
    const status = data.readUInt16LE(offset); offset += 2;

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


const ERRORS = {
  [Services.ReadTag]: {
    0x04: 'A syntax error was detected decoding the Request Path',
    0x05: 'Request Path destination unknown: Probably instance number is not present',
    0x06: 'Insufficient Packet Space: Not enough room in the response buffer for all the data',
    0x13: 'Insufficient Request Data: Data too short for expected parameters',
    0x26: 'The Request Path Size received was shorter or longer than expected',
    0xFF: {
      0x2105: 'General Error: Access beyond end of the object',
    }
  },
  [Services.ReadTagFragmented]: {
    0x04: 'A syntax error was detected decoding the Request Path',
    0x05: 'Request Path destination unknown: Probably instance number is not present',
    0x06: 'Insufficient Packet Space: Not enough room in the response buffer for all the data',
    0x13: 'Insufficient Request Data: Data too short for expected parameters',
    0x26: 'The Request Path Size received was shorter or longer than expected',
    0xFF: {
      0x2105: 'General Error: Number of Elements or Byte Offset is beyond the end of the requested tag',
    }
  },
  [Services.WriteTag]: {
    0x04: 'A syntax error was detected decoding the Request Path.',
    0x05: 'Request Path destination unknown: Probably instance number is not present',
    0x10: {
      0x2101: 'Device state conflict: keyswitch position: The requestor is attempting to change force information in HARD RUN mode',
      0x2802: 'Device state conflict: Safety Status: The controller is in a state in which Safety Memory cannot be modified'
    },
    0x13: 'Insufficient Request Data: Data too short for expected parameters',
    0x26: 'The Request Path Size received was shorter or longer than expected',
    0xFF: {
      0x2105: 'General Error: Number of Elements extends beyond the end of the requested tag',
      0x2107: 'General Error: Tag type used n request does not match the target tag’s data type'
    }
  },
  [Services.WriteTagFragmented]: {
    0x04: 'A syntax error was detected decoding the Request Path.',
    0x05: 'Request Path destination unknown: Probably instance number is not present',
    0x10: {
      0x2101: 'Device state conflict: keyswitch position: The requestor is attempting to change force information in HARD RUN mode',
      0x2802: 'Device state conflict: Safety Status: The controller is in a state in which Safety Memory cannot be modified'
    },
    0x13: 'Insufficient Request Data: Data too short for expected parameters',
    0x26: 'The Request Path Size received was shorter or longer than expected',
    0xFF: {
      0x2104: 'General Error: Offset is beyond end of the requested tag',
      0x2105: 'General Error: Number of Elements extends beyond the end of the requested tag',
      0x2107: 'General Error: Tag type used n request does not match the target tag’s data type'
    }
  }
}


function getError(reply) {
  if (reply.status.description) {
    return reply.status.description;
  }

  let error;
  let extended;

  if (Buffer.isBuffer(reply.status.additional) && reply.status.additional.length   >= 2) {
    extended = reply.status.additional.readUInt16LE(0);
  }

  const code = reply.status.code;
  const service = getBits(reply.service, 0, 7);

  const errorObject = ERRORS[service];

  if (errorObject) {
    if (typeof errorObject[code] === 'object') {
      if (extended != null) {
        error = errorObject[code][extended];
      }
    } else {
      error = errorObject[code];
    }
  }

  return error || 'Unknown error';
}


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