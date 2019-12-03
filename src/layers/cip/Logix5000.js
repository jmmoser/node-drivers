'use strict';

const EPath = require('./objects/EPath');
const CIPLayer = require('./objects/CIPLayer');
const ConnectionLayer = require('./objects/Connection');

const {
  DataTypes,
  DataTypeNames,
  Encode,
  Decode,
  CommonServices
} = require('./objects/CIP');

const {
  getBit,
  getBits,
  CallbackPromise,
  InvertKeyValues,
  InfoError
} = require('../../utils');


class Logix5000 extends CIPLayer {
  constructor(lowerLayer) {
    if (!(lowerLayer instanceof ConnectionLayer)) {
      /* Inject Connection as lower layer */
      lowerLayer = new ConnectionLayer(lowerLayer);
    }
    super('cip.logix5000', lowerLayer);
    this._tagIDtoDataType = new Map();
    this._templates = new Map();
    this._tagListAttributes = new Map();
    this._tags = new Map();
  }


  readTag(tag, elements, callback) {
    if (callback == null && typeof elements === 'function') {
      callback = elements;
    }

    if (!Number.isFinite(elements)) {
      elements = 1;
    }

    return CallbackPromise(callback, resolver => {
      if (!tag) {
        return resolver.reject('Tag must be specified');
      }

      elements = parseInt(elements, 10);
      if (elements > 0xFFFF) {
        return resolver.reject('Too many elements to read');
      }
      if (elements <= 0) {
        return resolver.reject('Not enough elements to read');
      }

      const path = encodeTagPath(tag);

      const data = Encode(DataTypes.UINT, elements);

      send(this, SymbolServiceCodes.ReadTag, path, data, async (error, reply) => {
        if (error) {
          resolver.reject(error, reply);
        } else {
          try {
            const data = reply.data;
            let offset = 0;

            console.log(reply);

            let dataType;
            offset = Decode(DataTypes.UINT, data, offset, val => dataType = val);

            let isStructure = false, templateID;
            if (dataType === DataTypes.STRUCT) {
              isStructure = true;
              offset = Decode(DataTypes.UINT, data, offset, val => templateID = val);
            }

            /** 
             * NEED TO HANDLE STRUCTURE TAGS
             * */
            const values = [];

            if (!isStructure) {
              for (let i = 0; i < elements; i++) {
                offset = Decode(dataType, data, offset, value => values.push(value));
              }
            } else {
              // const template = await getTemplateInfo(this, templateID);
              // console.log(template);
              console.log(await this.getTagInfo(tag));
              values.push(data.slice(offset));
            }

            if (elements === 1) {
              resolver.resolve(values[0]);
            } else {
              resolver.resolve(values);
            }
          } catch (err) {
            resolver.reject(err, reply);
          }
        }
      });
    });
  }


  writeTag(tag, value, callback) {
    return CallbackPromise(callback, async resolver => {
      if (!tag) {
        return resolver.reject('tag must be specified');
      }

      if (!this._tagIDtoDataType.has(tag)) {
        await this.readTag(tag);
        if (!this._tagIDtoDataType.has(tag)) {
          return resolver.reject('Unable to determine data type');
        }
      }

      const dataType = this._tagIDtoDataType.get(tag);

      const valueData = Encode(dataType, value);

      if (!Buffer.isBuffer(valueData)) {
        return resolver.reject(`Unable to encode data type: ${DataTypeNames[dataType] || dataType}`);
      }

      const service = SymbolServiceCodes.WriteTag;

      const path = encodeTagPath(tag);

      const data = Buffer.alloc(4 + valueData.length);
      data.writeUInt16LE(dataType, 0);
      data.writeUInt16LE(1, 2);
      valueData.copy(data, 4);

      send(this, service, path, data, (error, reply) => {
        if (error) {
          resolver.reject(error, reply);
        } else {
          resolver.resolve(reply);
        }
      });
    });
  }


  readModifyWriteTag(tag, ORmasks, ANDmasks, callback) {
    return CallbackPromise(callback, resolver => {
      if (tag == null) {
        return resolver.reject('tag must be specified');
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

      const service = SymbolServiceCodes.ReadModifyWriteTag;

      const path = encodeTagPath(tag);

      const data = Buffer.alloc(2 + 2 * sizeOfMasks);
      data.writeUInt16LE(sizeOfMasks, 0);
      for (let i = 0; i < sizeOfMasks; i++) {
        data.writeUInt8(ORmasks[i], 2 + i);
        data.writeUInt8(ANDmasks[i], 2 + sizeOfMasks + i);
      }

      send(this, service, path, data, (error, reply) => {
        if (error) {
          resolver.reject(error, reply);
        } else {
          resolver.resolve(reply);
        }
      });
    });
  }


  async readTagAttributeList(tag, attributes, callback) {
    if (!Array.isArray(attributes)) {
      attributes = [1, 2, 3, 5, 6, 7, 8, 9, 10, 11];
    }

    return CallbackPromise(callback, resolver => {
      const service = CommonServices.GetAttributeList;

      const path = encodeTagPath(tag);

      const data = Buffer.alloc(2 + attributes.length * 2);
      data.writeUInt16LE(attributes.length, 0);
      for (let i = 0; i < attributes.length; i++) {
        data.writeUInt16LE(attributes[i], 2 * (i + 1));
      }

      send(this, service, path, data, (error, reply) => {
        if (error) {
          resolver.reject(error, reply);
        } else {
          try {
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
                  offset = Decode(DataTypes.STRING, data, offset, val => value = val);
                  break;
                case 2:
                  name = 'dataType';
                  offset = Decode(DataTypes.INT, data, offset, val => value = parseSymbolType(val));
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
                  offset = Decode(DataTypes.INT, data, offset, val => value = val);
                  break;
                case 8:
                  name = 'arrayDimensions';
                  value = data.slice(offset, offset + 12);
                  value = [];
                  for (let j = 0; j < 3; j++) {
                    offset = Decode(DataTypes.DINT, data, offset, val => value.push(val));
                  }
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
          } catch (err) {
            resolver.reject(err, reply);
          }
        }
      });
    });
  }


  async readTagAttributesAll(tag, callback) {
    return CallbackPromise(callback, resolver => {
      const service = CommonServices.GetAttributesAll;

      const path = encodeTagPath(tag);

      send(this, service, path, null, (error, reply) => {
        if (error) {
          resolver.reject(error, reply);
        } else {
          try {
            const data = reply.data;

            let offset = 0;

            const attributes = [];

            /** Attribute 2 */
            offset = Decode(DataTypes.INT, data, offset, val => {
              const type = parseSymbolType(val);
              attributes.push({
                name: 'dataType',
                code: 2,
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
            offset = Decode(DataTypes.STRING, reply.data, 6, val => {
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
          } catch (err) {
            resolver.reject(err, reply);
          }
        }
      });
    });
  }
  

  // async test(service, path, data) {
  //   return CallbackPromise(null, resolver => {
  //     send(this, service, path, data, (err, reply) => {
  //       if (err) {
  //         resolver.reject(err, reply);
  //       } else {
  //         resolver.resolve(reply);
  //       }
  //     });
  //   });
  // }


  async getTagInfo(tag) {
    if (this._tags.has(tag)) {
      return this._tags.get(tag);
    }

    const attributes = [
      SymbolInstanceAttributeCodes.Name,
      SymbolInstanceAttributeCodes.Type
    ];

    const data = Buffer.alloc(2 + attributes.length * 2);
    data.writeUInt16LE(attributes.length, 0);
    for (let i = 0; i < attributes.length; i++) {
      data.writeUInt16LE(attributes[i], 2 * (i + 1));
    }

    const path = encodeTagPath(tag);

    const reply = await sendPromise(
      this,
      SymbolServiceCodes.GetInstanceAttributeList,
      path,
      data
    );

    const tags = [];

    parseListTagsResponse(reply, attributes, tags);

    this._tagListAttributes.set(t.id, t);
    this._tagListAttributes.set(t.name, t);

    // const tag
    return reply;
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

    if (!Number.isFinite(instance)) {
      throw new Error(`Instance ID must be a finite integer`);
    }

    if (instance >= 0xFFFF) {
      throw new Error(`Specified instance ID, ${instance}, is greater than max, 65535`);
    }

    let instanceID = parseInt(instance, 10);

    const attributes = [
      SymbolInstanceAttributeCodes.Name,
      SymbolInstanceAttributeCodes.Type
    ];

    const data = Buffer.alloc(2 + attributes.length * 2);
    data.writeUInt16LE(attributes.length, 0);
    for (let i = 0; i < attributes.length; i++) {
      data.writeUInt16LE(attributes[i], 2 * (i + 1));
    }

    const service = SymbolServiceCodes.GetInstanceAttributeList;

    while(true) {
      const path = EPath.Encode(
        ClassCodes.Symbol,
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
      const service = TemplateServiceCodes.Read;
      
      const path = EPath.Encode(
        ClassCodes.Template,
        template.id
      );

      const bytesToRead = (template.attributes.definitionSize * 4) - 23;

      let offset = 0;

      const data = Buffer.alloc(6);
      data.writeUInt32LE(offset, 0);
      data.writeUInt16LE(bytesToRead, 4);

      send(this, service, path, data, (error, reply) => {
        if (error) {
          resolver.reject(error, reply);
        } else {
          try {
            resolver.resolve(parseReadTemplate(reply, template));
          } catch (err) {
            resolver.reject(err, reply);
          }
        }
      });
    });
  }


  readTemplateInstanceAttributes(templateID, callback) {
    return CallbackPromise(callback, resolver => {
      const service = CommonServices.GetAttributeList;

      const path = EPath.Encode(
        ClassCodes.Template,
        templateID
      );

      const attributes = [
        TemplateInstanceAttributeCodes.StructureHandle,
        TemplateInstanceAttributeCodes.MemberCount,
        TemplateInstanceAttributeCodes.DefinitionSize,
        TemplateInstanceAttributeCodes.StructureSize
      ];

      const data = Buffer.alloc(2 + attributes.length * 2);
      data.writeUInt16LE(attributes.length, 0);
      for (let i = 0; i < attributes.length; i++) {
        data.writeUInt16LE(attributes[i], 2 * (i + 1));
      }

      send(this, service, path, data, (error, reply) => {
        if (error) {
          resolver.reject(error, reply);
        } else {
          try {
            const template = parseReadTemplateInstanceAttributes(reply);
            resolver.resolve(template);
          } catch (err) {
            resolver.reject(err, reply);
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
      const service = CommonServices.GetAttributeList;

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

      send(this, service, path, data, (error, reply) => {
        if (error) {
          resolver.reject(error, reply);
        } else {
          try {
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
                  return resolver.reject(`Unexpected attribute received: ${attributeNumber}`, reply);
              }
              attributeResponses.push({
                attribute: attributeNumber,
                status: attributeStatus,
                value: attributeValue
              });
            }

            resolver.resolve(attributeResponses);
          } catch (err) {
            resolver.reject(err, reply);
          }
        }
      });
    });
  }


  readTagFragmented(tag, elements, callback) {
    if (callback == null && typeof elements === 'function') {
      callback = elements;
    }

    if (!Number.isFinite(elements)) {
      elements = 1;
    }

    return CallbackPromise(callback, async resolver => {
      if (!tag) {
        return resolver.reject(new Error('Tag must be specified'));
      }

      elements = parseInt(elements, 10);
      if (elements > 0xFFFF) {
        return resolver.reject(new Error('Too many elements to read'));
      }
      if (elements <= 0) {
        return resolver.reject(new Error('Not enough elements to read'));
      }

      const service = SymbolServiceCodes.ReadTagFragmented;
      const path = encodeTagPath(tag);

      const reqData = Buffer.allocUnsafe(6);
      reqData.writeUInt16LE(elements, 0);

      let dataOffset = 0;
      const values = [];

      try {
        while (true) {
          reqData.writeUInt32LE(dataOffset, 2);
          const reply = await sendPromise(this, service, path, reqData);

          let offset = 0;
          const data = reply.data;
          const dataLength = data.length;

          let dataType;
          offset = Decode(DataTypes.UINT, data, offset, val => dataType = val);

          while (offset < dataLength) {
            offset = Decode(dataType, data, offset, val => values.push(val));
          }

          if (reply.status.code !== 0x06) {
            break;
          } else {
            dataOffset = dataLength;
          }
        }

        if (elements === 1) {
          resolver.resolve(values.length > 0 ? values[0] : undefined);
        } else {
          resolver.resolve(values);
        }
      } catch (err) {
        resolver.reject(err, reply);
      }
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
    send(self, service, path, data, (error, reply) => {
      if (error) {
        reject(new InfoError(reply, error));
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
    if (reply && SymbolServiceNames[reply.service.code]) {
      reply.service.name = SymbolServiceNames[reply.service.code];
    }
    callback(error, reply);
  }, timeout);
}


function encodeTagPath(tag) {
  switch (typeof tag) {
    case 'string':
      return EPath.EncodeANSIExtSymbol(tag);
    case 'number':
      return EPath.Encode(ClassCodes.Symbol, tag);
    case 'object':
      return EPath.Encode(ClassCodes.Symbol, tag.id);
    default:
      throw new Error('Tag must be a tag name, symbol instance number, or a tag object');
  }
}


async function getTemplateInfo(self, tag) {
  if (self._templates.has(tag)) {
    console.log(`Using cached template info: ${tag}`);
    return self._templates.get(tag);
  }

  console.log(`Reading template info: ${tag}`);
  const template = {};
  template.attributes = await self.readTemplateInstanceAttributes(templateID);
  template.definition = await self.readTemplate(template);
  self._templates.set(templateID, template);
  return template;
}


function parseListTagsResponse(reply, attributes, tags) {
  const data = reply.data;
  const length = data.length;

  let offset = 0;
  let lastInstanceID = 0;

  const NameAttributeCode = SymbolInstanceAttributeCodes.Name;
  const TypeAttributeCode = SymbolInstanceAttributeCodes.Type;

  while (offset < length) {
    const tag = {};

    offset = Decode(DataTypes.UDINT, data, offset, val => tag.id = val);
    lastInstanceID = tag.id;

    for (let i = 0; i < attributes.length; i++) {
      const attribute = attributes[i];
      const attributeDataType = SymbolInstanceAttributeDataTypes[attribute];
      switch (attribute) {
        case NameAttributeCode:
          offset = Decode(attributeDataType, data, offset, val => tag.name = val);
          break;
        case TypeAttributeCode:
          offset = Decode(attributeDataType, data, offset, val => tag.type = parseSymbolType(val));
          break;
        default:
          throw new Error(`Unknown attribute: ${attributes[i]}`);
      }
    }

    tags.push(tag);
  }

  return lastInstanceID;
}


function parseSymbolType(code) {
  const res = {};
  res.atomic = getBit(code, 15) === 0;
  res.system = !!getBit(code, 12);
  res.dimensions = getBits(code, 13, 15);

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
  const nullIndex = data.indexOf(0x00, offset);

  if (nullIndex >= 0) {
    cb(data.toString('ascii', offset, nullIndex));
    return nullIndex + 1;
  }

  return offset;
}


function parseTemplateNameInfo(data, offset, cb) {
  return parseTemplateMemberName(data, offset, fullname => {
    const parts = fullname.split(';');
    cb({
      name: parts.length > 0 ? parts[0] : '',
      extra: parts.length > 1 ? parts[1] : ''
    });
  });
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

  /** Read the template name and extra characters after ';' */
  let structureName;
  let extra;
  offset = parseTemplateNameInfo(data, offset, info => {
    structureName = info.name;
    extra = info.extra
  });

  /** Read the member names */
  for (let i = 0; i < members.length; i++) {
    offset = parseTemplateMemberName(data, offset, name => members[i].name = name);
  }

  return {
    name: structureName,
    extra,
    members,
    data: data.slice(offset)
  };
}


function parseReadTemplateInstanceAttributes(reply) {
  const { data } = reply;

  let offset = 0;
  const attributeCount = data.readUInt16LE(offset); offset += 2;
  const template = {};

  const StructureHandleCode = TemplateInstanceAttributeCodes.StructureHandle;
  const MemberCountCode = TemplateInstanceAttributeCodes.MemberCount;
  const DefinitionSizeCode = TemplateInstanceAttributeCodes.DefinitionSize;
  const StructureSizeCode = TemplateInstanceAttributeCodes.StructureSize;

  for (let i = 0; i < attributeCount; i++) {
    let attribute, status;
    offset = Decode(DataTypes.UINT, data, offset, val => attribute = val);
    offset = Decode(DataTypes.UINT, data, offset, val => status = val);

    const attributeDataType = TemplateInstanceAttributeDataTypes[attribute];

    if (status === 0) {
      switch (attribute) {
        case StructureHandleCode:
          offset = Decode(attributeDataType, data, offset, val => template.structureHandle = val);
          break;
        case MemberCountCode:
          offset = Decode(attributeDataType, data, offset, val => template.memberCount = val);
          break;
        case DefinitionSizeCode:
          offset = Decode(attributeDataType, data, offset, val => template.definitionSize = val);
          break;
        case StructureSizeCode:
          offset = Decode(attributeDataType, data, offset, val => template.structureSize = val);
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
        // description: READ_TAG_ERRORS[status]
      });
    }
  }

  return template;
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

  const errorObject = SymbolServiceErrors[service];

  if (errorObject) {
    if (typeof errorObject[code] === 'object') {
      if (extended != null) {
        error = errorObject[code][extended];
      }
    } else {
      error = errorObject[code];
    }
  }

  return error || 'Unknown Logix5000 error';
}


const ClassCodes = {
  Symbol: 0x6B,
  Template: 0x6C
};



/** 1756-PM020, pg. 16 */
const SymbolServiceCodes = {
  ReadTag: 0x4C,
  ReadTagFragmented: 0x52,
  WriteTag: 0x4D,
  WriteTagFragmented: 0x53,
  ReadModifyWriteTag: 0x4E,
  MultipleServicePacket: 0x0A,

  GetInstanceAttributeList: 0x55
};

const SymbolServiceNames = InvertKeyValues(SymbolServiceCodes);

const SymbolServiceErrors = {
  [SymbolServiceCodes.ReadTag]: {
    0x04: 'A syntax error was detected decoding the Request Path',
    0x05: 'Request Path destination unknown: Probably instance number is not present',
    0x06: 'Insufficient Packet Space: Not enough room in the response buffer for all the data',
    0x13: 'Insufficient Request Data: Data too short for expected parameters',
    0x26: 'The Request Path Size received was shorter or longer than expected',
    0xFF: {
      0x2105: 'General Error: Access beyond end of the object',
    }
  },
  [SymbolServiceCodes.ReadTagFragmented]: {
    0x04: 'A syntax error was detected decoding the Request Path',
    0x05: 'Request Path destination unknown: Probably instance number is not present',
    0x06: 'Insufficient Packet Space: Not enough room in the response buffer for all the data',
    0x13: 'Insufficient Request Data: Data too short for expected parameters',
    0x26: 'The Request Path Size received was shorter or longer than expected',
    0xFF: {
      0x2105: 'General Error: Number of Elements or Byte Offset is beyond the end of the requested tag',
    }
  },
  [SymbolServiceCodes.WriteTag]: {
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
  [SymbolServiceCodes.WriteTagFragmented]: {
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

const SymbolInstanceAttributeCodes = {
  Name: 0x01,
  Type: 0x02
};

// const SymbolInstanceAttributeNames = InvertKeyValues(SymbolInstanceAttributeCodes);

const SymbolInstanceAttributeDataTypes = {
  [SymbolInstanceAttributeCodes.Name]: DataTypes.STRING,
  [SymbolInstanceAttributeCodes.Type]: DataTypes.UINT
};


const TemplateServiceCodes = {
  Read: 0x4C
};


const TemplateInstanceAttributeCodes = {
  StructureHandle: 0x01, /** Calculated CRC value for members of the structure */
  MemberCount: 0x02, /** Number of members defined in the structure */
  DefinitionSize: 0x04, /** Size of the template definition structure */
  StructureSize: 0x05 /** Number of bytes transferred on the wire when the structure is read using the Read Tag service */
};

const TemplateInstanceAttributeDataTypes = {
  [TemplateInstanceAttributeCodes.StructureHandle]: DataTypes.UINT,
  [TemplateInstanceAttributeCodes.MemberCount]: DataTypes.UINT,
  [TemplateInstanceAttributeCodes.DefinitionSize]: DataTypes.UDINT,
  [TemplateInstanceAttributeCodes.StructureSize]: DataTypes.UDINT
};