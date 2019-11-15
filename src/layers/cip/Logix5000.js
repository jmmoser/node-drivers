'use strict';

const EPath = require('./objects/EPath');
const CIPLayer = require('./objects/CIPLayer');
const ConnectionLayer = require('./objects/Connection');
const { ANSIExtSymbolSegment } = require('./objects/MessageRouter');
const { DataTypes, DataTypeNames, EncodeValue, DecodeValue, CommonServices } = require('./objects/CIP');
const { getBit, getBits, CallbackPromise, InvertKeyValues } = require('../../utils');


class Logix5000 extends CIPLayer {
  constructor(lowerLayer) {
    if (!(lowerLayer instanceof ConnectionLayer)) {
      /* Inject Connection as lower layer */
      lowerLayer = new ConnectionLayer(lowerLayer);
    }
    super('cip.logix5000', lowerLayer);
    this._tagIDtoDataType = new Map();
  }


  readTag(tag, number, callback) {
    if (callback == null && typeof number === 'function') {
      callback = number;
    }

    if (!Number.isFinite(number)) {
      number = 1;
    }

    return CallbackPromise(callback, resolver => {
      if (!tag) {
        return resolver.reject('Tag must be specified');
      }

      number = parseInt(number, 10);
      if (number > 0xFFFF) {
        return resolver.reject('Too many elements to read');
      }
      if (number <= 0) {
        return resolver.reject('Not enough elements to read');
      }

      let path;
      let userSuppliedTagID;
      switch (typeof tag) {
        case 'string':
          userSuppliedTagID = tag;
          path = ANSIExtSymbolSegment(tag);
          break;
        case 'number':
          userSuppliedTagID = tag;
          path = EPath.Encode(Classes.Symbol.Code, tag);
          break;
        case 'object':
          userSuppliedTagID = tag.id;
          path = EPath.Encode(Classes.Symbol.Code, tag.id);
          break;
        default:
          return resolver.reject('Tag must be a tag name, symbol instance number, or a tag object');
      }

      const data = Buffer.allocUnsafe(2);
      data.writeUInt16LE(number, 0);

      send(this, Services.ReadTag, path, data, (error, reply) => {
        if (error) {
          resolver.reject(error, reply);
        } else {
          try {
            const dataType = reply.data.readUInt16LE(0);
            this._tagIDtoDataType.set(userSuppliedTagID, dataType);

            let offset = 2;
            const values = [];
            for (let i = 0; i < number; i++) {
              offset = DecodeValue(dataType, reply.data, offset, value => values.push(value));
            }

            if (number === 1) {
              resolver.resolve(values[0]);
            } else {
              resolver.resolve(values);
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


  async readTagAttributeList(tag, attributes, callback) {
    return CallbackPromise(callback, resolver => {
      let path;
      switch (typeof tag) {
        case 'string':
          path = ANSIExtSymbolSegment(tag);
          break;
        case 'number':
          path = EPath.Encode(Classes.Symbol.Code, tag);
          break;
        case 'object':
          path = EPath.Encode(Classes.Symbol.Code, tag.id);
          break;
        default:
          return resolver.reject('Tag must be a tag name, symbol instance number, or a tag object');
      }

      const service = CommonServices.GetAttributeList;

      const data = Buffer.alloc(2 + attributes.length * 2);
      data.writeUInt16LE(attributes.length, 0);
      for (let i = 0; i < attributes.length; i++) {
        data.writeUInt16LE(attributes[i], 2 * (i + 1));
      }

      send(this, service, path, data, (error, reply) => {
        if (error) {
          resolver.reject(error, reply);
        } else {
          const data = reply.data;

          let offset = 0;
          const attributeCount = data.readUInt16LE(offset); offset += 2;
          const attributeResults = [];

          for (let i = 0; i < attributeCount; i++) {
            const code = data.readUInt16LE(offset); offset += 2;
            const status = data.readUInt16LE(offset); offset += 2;
            let name, value;
            switch (code) {
              case 1:
                name = 'name';
                offset = DecodeValue(DataTypes.STRING, data, offset, val => value = val);
                break;
              case 2:
                name = 'dataType';
                offset = DecodeValue(DataTypes.INT, data, offset, val => value = parseSymbolType(val));
                break;
              case 3:
                name = 'unknown';
                value = data.slice(offset, offset + 4);
                offset += 4;
                break;
              // case 4:
              //   // Status is non-zero
              case 5:
                name = 'unknown';
                value = data.slice(offset, offset + 4);
                offset += 4;
                break;
              case 6:
                name = 'unknown';
                value = data.slice(offset, offset + 4);
                offset += 4;
                break;
              case 7:
                name = 'bytes';
                offset = DecodeValue(DataTypes.INT, data, offset, val => value = val);
                break;
              case 8:
                name = 'unknown';
                value = data.slice(offset, offset + 12);
                offset += 12;
                break;
              case 9:
                name = 'unknown';
                value = data.slice(offset, offset + 1);
                offset += 1;
                break;
              case 10:
                name = 'unknown';
                value = data.slice(offset, offset + 1);
                offset += 1;
                break;
              case 11:
                name = 'unknown';
                value = data.slice(offset, offset + 1);
                offset += 1;
                break;
              default:
                return resolver.reject(`Unknown attribute received: ${attributeCode}`);
            }
            attributeResults.push({
              code,
              name,
              status,
              value
            });
          }

          reply.attributes = attributeResults;

          resolver.resolve(reply);
        }
      });
    });
  }


  async readTagAttributesAll(tag, callback) {
    return CallbackPromise(callback, resolver => {
      let path;
      switch (typeof tag) {
        case 'string':
          path = ANSIExtSymbolSegment(tag);
          break;
        case 'number':
          path = EPath.Encode(Classes.Symbol.Code, tag);
          break;
        case 'object':
          path = EPath.Encode(Classes.Symbol.Code, tag.id);
          break;
        default:
          return resolver.reject('Tag must be a tag name, symbol instance number, or a tag object');
      }

      const service = CommonServices.GetAttributesAll;

      send(this, service, path, null, (error, reply) => {
        if (error) {
          resolver.reject(error, reply);
        } else {
          const data = reply.data;

          let offset = 0;

          const attributes = [];

          /** Attribute 1 */
          offset = DecodeValue(DataTypes.INT, data, offset, val => {
            const type = parseSymbolType(val);
            attributes.push({
              name: 'type',
              code: 1,
              value: type
            });
          });

          /** Attribute 3 */
          attributes.push({
            name: 'unknown',
            code: 3,
            value: data.slice(offset, offset + 4)
          });
          offset += 4;

          /** Attribute 1 */
          offset = DecodeValue(DataTypes.STRING, reply.data, 6, val => {
            attributes.push({
              name: 'name',
              code: 1,
              value: val
            });
          });

          /** Attribute 5 */
          attributes.push({
            name: 'unknown',
            code: 5,
            value: data.slice(offset, offset + 4)
          });
          offset += 4;

          /** Attribute 6 */
          attributes.push({
            name: 'unknown',
            code: 6,
            value: data.slice(offset, offset + 4)
          });
          offset += 4;

          reply.info = attributes;
          resolver.resolve(reply);
        }
      });
    });
  }
  

  async* listTags(options) {
    const {
      timeout,
      instance,
      includeSystem
    } = Object.assign({
      timeout: 30000,
      instance: 0,
      includeSystem: false
    }, options);

    // const timeout = (options || {}).timeout;
    // let instanceID = (options || {}).instanceID || 0;

    let instanceID = instance;

    if (instanceID >= 0xFFFF) {
      throw new Error('MAX INSTANCE ID');
    }

    const attributes = [
      Classes.Symbol.Attributes.Name.Code,
      Classes.Symbol.Attributes.Type.Code
    ];

    const data = Buffer.alloc(2 + attributes.length * 2);
    data.writeUInt16LE(attributes.length, 0);
    for (let i = 0; i < attributes.length; i++) {
      data.writeUInt16LE(attributes[i], 2 * (i + 1));
    }

    const service = Classes.Symbol.Services.GetInstanceAttributeList.Code;

    while(true) {
      const path = EPath.Encode(
        Classes.Symbol.Code,
        instanceID
      );

      const reply = await sendPromise(this, service, path, data, timeout);

      const tags = [];
      const lastInstanceID = parseListTagsResponse(reply, attributes, tags);

      for (let i = 0; i < tags.length; i++) {
        const tag = tags[i];
        if (includeSystem || !tag.type.system) {
          if (tag.type.atomic !== true) {
            tag.type.template.attributes = await this.readTemplateInstanceAttributes(tag.type.template.id);
            tag.type.template.definition = await this.readTemplate(tag.type.template);
          }
          yield tags[i];
        }
      }

      if (reply.status.code === 0 || tags.length <= 0) {
        break;
      }

      instanceID = lastInstanceID + 1;
    }
  }


  readTemplate(template, callback) {
    return CallbackPromise(callback, resolver => {
      const path = EPath.Encode(
        Classes.Template.Code,
        template.id
      );

      const bytesToRead = (template.attributes.definitionSize * 4) - 23;

      let offset = 0;

      const data = Buffer.alloc(6);
      data.writeUInt32LE(offset, 0);
      data.writeUInt16LE(bytesToRead, 4);

      send(this, Classes.Template.Services.Read, path, data, (error, reply) => {
        if (error) {
          resolver.reject(error, reply);
        } else {
          try {
            resolver.resolve(parseReadTemplate(reply, template));
          } catch (err) {
            resolver.reject(err.message, reply);
          }
        }
      });
    });
  }


  readTemplateInstanceAttributes(templateID, callback) {
    return CallbackPromise(callback, resolver => {
      const path = EPath.Encode(
        Classes.Template.Code,
        templateID
      );

      const attributes = [
        Classes.Template.Attributes.StructureHandle.Code,
        Classes.Template.Attributes.MemberCount.Code,
        Classes.Template.Attributes.DefinitionSize.Code,
        Classes.Template.Attributes.StructureSize.Code,
      ];

      const data = Buffer.alloc(2 + attributes.length * 2);
      data.writeUInt16LE(attributes.length, 0);
      for (let i = 0; i < attributes.length; i++) {
        data.writeUInt16LE(attributes[i], 2 * (i + 1));
      }

      send(this, CommonServices.GetAttributeList, path, data, (error, reply) => {
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

  /**
   * 1756-PM020, page 53
   * Use to determine when the tags list and
   * structure information need refreshing
   * */
  readControllerAttributes(callback) {
    return CallbackPromise(callback, resolver => {
      const path = EPath.Encode(
        0xAC,
        0x01
      );

      const attributes = [1, 2, 3, 4, 10];

      const data = Buffer.alloc(2 + attributes.length * 2);
      data.writeUInt16LE(attributes.length, 0);
      for (let i = 0; i < attributes.length; i++) {
        data.writeUInt16LE(attributes[i], 2 * (i + 1));
      }

      send(this, CommonServices.GetAttributeList, path, data, (error, reply) => {
        if (error) {
          resolver.reject(error, reply);
        } else {
          const attributeResponses = [];
          const data = reply.data;
          let offset = 0;

          const numberOfAttributes = data.readUInt16LE(offset); offset += 2;
          for (let i = 0; i < numberOfAttributes; i++) {
            const attributeNumber = data.readUInt16LE(offset); offset += 2;
            const attributeStatus = data.readUInt16LE(offset); offset += 2;
            let attributeValue;
            switch (attributeNumber) {
              case 1:
              case 2:
                attributeValue = data.readUInt16LE(offset); offset += 2;
                break;
              case 3:
              case 4:
              case 10:
                attributeValue = data.readUInt32LE(offset); offset += 4;
                break;
              default:
                return resolver.reject(`Unexpected attribute received: ${attributeNumber}`);
            }
            attributeResponses.push({
              attribute: attributeNumber,
              status: attributeStatus,
              value: attributeValue
            });
          }

          resolver.resolve(attributeResponses);
        }
      });
    });
  }


  handleData(data, info, context) {
    if (context == null) {
      throw new Error('Logix5000 Error: Unhandled message, context should not be null.');
    }

    const callback = this.callbackForContext(context);
    if (callback != null) {
      callback(null, data, info);
    } else {
      console.log('Logix5000 Warning: Unhandled data received.');
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
    if (error && reply) {
      error = getError(reply);
    }
    /** Update the service name for Logix5000 specific services */
    if (reply && ServiceNames[reply.service.code]) {
      reply.service.name = ServiceNames[reply.service.code];
    }
    callback(error, reply);
  }, timeout);
}


function parseListTagsResponse(reply, attributes, tags) {
  const data = reply.data;
  const length = data.length;

  let offset = 0;
  let lastInstanceID = 0;

  const NameAttributeCode = Classes.Symbol.Attributes.Name.Code;
  const TypeAttributeCode = Classes.Symbol.Attributes.Type.Code;

  while (offset < length) {
    const tag = {};

    tag.id = data.readUInt32LE(offset); offset += 4;
    lastInstanceID = tag.id;

    for (let i = 0; i < attributes.length; i++) {
      switch (attributes[i]) {
        case NameAttributeCode:
          offset = DecodeValue(DataTypes.STRING, data, offset, val => tag.name = val);
          break;
        case TypeAttributeCode:
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
  res.atomic = getBit(code, 15) === 0;
  res.system = !!getBit(code, 12);
  res.dimensions = getBits(code, 13, 15);
  // res.structure = !atomic;

  if (res.atomic) {
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


function parseTemplateMemberName(data, offset, cb) {
  const characters = [];
  const dataLength = data.length;
  while (offset < dataLength) {
    const characterCode = data.readUInt8(offset); offset += 1;
    if (characterCode === 0x00) {
      break;
    }

    characters.push(String.fromCharCode(characterCode));
  }
  cb(characters.join(''));
  return offset;
}

function parseTemplateName(data, offset, cb) {
  const characters = [];
  const dataLength = data.length;
  let skip = false;
  while (offset < dataLength) {
    const characterCode = data.readUInt8(offset); offset += 1;

    if (characterCode === 0x00) {
      break;
    }

    /** skip characters on and after 0x3B, continue reading until 0x00 */
    if (characterCode === 0x3B) {
      skip = true;
    }

    if (!skip) {
      characters.push(String.fromCharCode(characterCode));
    }
  }
  cb(characters.join(''));
  return offset;
}


function parseReadTemplate(reply, template) {
  const { data } = reply;

  const dataLength = data.length;
  const members = [];

  let offset = 0;
  for (let i = 0; i < template.attributes.memberCount; i++) {
    if (offset < dataLength - 8) {
      const info = data.readUInt16LE(offset); offset += 2;
      const type = data.readUInt16LE(offset); offset += 2;
      const memberOffset = data.readUInt32LE(offset); offset += 4;
      members.push({
        info,
        type,
        typeName: DataTypeNames[type] || 'UNKNOWN',
        offset: memberOffset
      });
    }
  }

  /** Read the template name */
  let structureName;
  offset = parseTemplateName(data, offset, name => structureName = name);

  /** Read the member names */
  for (let i = 0; i < members.length; i++) {
    offset = parseTemplateMemberName(data, offset, name => members[i].name = name);
  }

  return {
    name: structureName,
    members,
    data: data.slice(offset)
  };
}


function parseReadTemplateInstanceAttributes(reply) {
  const { data } = reply;

  let offset = 0;
  const attributeCount = data.readUInt16LE(offset); offset += 2;
  const template = {};

  const StructureHandleCode = Classes.Template.Attributes.StructureHandle.Code;
  const MemberCountCode = Classes.Template.Attributes.MemberCount.Code;
  const DefinitionSizeCode = Classes.Template.Attributes.DefinitionSize.Code;
  const StructureSizeCode = Classes.Template.Attributes.StructureSize.Code;

  for (let i = 0; i < attributeCount; i++) {
    const attribute = data.readUInt16LE(offset); offset += 2;
    const status = data.readUInt16LE(offset); offset += 2;

    if (status === 0) {
      switch (attribute) {
        case StructureHandleCode:
          template.structureHandle = data.readUInt16LE(offset); offset += 2;
          break;
        case MemberCountCode:
          template.memberCount = data.readUInt16LE(offset); offset += 2;
          break;
        case DefinitionSizeCode:
          template.definitionSize = data.readUInt32LE(offset); offset += 4;
          break;
        case StructureSizeCode:
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

const ServiceNames = InvertKeyValues(Services);


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
  const service = getBits(reply.service.code, 0, 7);

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
      GetInstanceAttributeList: {
        Code: 0x55
      }
    },
    Attributes: {
      Name: {
        Code: 0x01
      },
      Type: {
        Code: 0x02
      }
    }
  },
  Template: {
    Code: 0x6C,
    Services: {
      Read: 0x4C
    },
    // const attributes = [
    //   0x01, // Attribute 1 - (UINT) Structure Handle, CRC for the members of the structure
    //   0x02, // Attribute 2 - (UINT) Number of structure members
    //   0x04, // Attribute 4 - (UDINT) Number of 32-bit words
    //   0x05  // Attribute 5 - (UDINT) Number of bytes of the structure data
    // ];
    Attributes: {
      StructureHandle: {
        Code: 0x01,
        Description: 'Calculated CRC value for members of the structure',
        // DataType: 'UINT'
      },
      MemberCount: {
        Code: 0x02,
        Description: 'Number of members defined in the structure',
        // DataType: 'UINT'
      },
      DefinitionSize: {
        Code: 0x04,
        Description: 'Size of the template definition structure',
        // DataType: 'UDINT'
      },
      StructureSize: {
        Code: 0x05,
        Description: 'Number of bytes transferred on the wire when the structure is read using the Read Tag service',
        // DataType: 'UDINT'
      }
    }
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