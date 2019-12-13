'use strict';

const DEFAULT_SCOPE = '__DEFAULT_GLOBAL_SCOPE__';

const EPath = require('../objects/EPath');
const CIPLayer = require('../objects/CIPLayer');
const ConnectionLayer = require('../objects/Connection');

// const RECORD_TYPES = {
//   CONTROLLER_ATTRIBUTES: 1,
//   TEMPLATE_ATTRIBUTES: 2,
//   TAGNAME_TO_SYMBOLID: 3,
//   TAG: 4
// };

const {
  DataType,
  DataTypeCodes,
  DataTypeNames,
  Encode,
  Decode,
  DecodeDataType,
  CommonServices
} = require('../objects/CIP');

const {
  getBit,
  getBits,
  CallbackPromise,
  InfoError
} = require('../../../utils');

// const path = require('path');
// const DB = require('../../../db');

const {
  LDataTypeCodes,
  LDatatypeNames,
  ClassCodes,
  SymbolServiceCodes,
  SymbolServiceNames,
  // SymbolServiceErrorDescriptions,
  SymbolInstanceAttributeCodes,
  SymbolInstanceAttributeNames,
  SymbolInstanceAttributeDataTypes,
  TemplateServiceCodes,
  TemplateInstanceAttributeCodes,
  TemplateInstanceAttributeDataTypes,
  GenericServiceStatusDescriptions
} = require('./constants');


class Logix5000 extends CIPLayer {
  constructor(lowerLayer, options) {
    if (!(lowerLayer instanceof ConnectionLayer)) {
      /** Inject Connection as lower layer */
      lowerLayer = new ConnectionLayer(lowerLayer, options);
    }
    super('cip.logix5000', lowerLayer);
    
    // options = Object.assign({
    //   optimize: false
    // }, options);

    // this._highestListedSymbolInstanceID = -1;
    this._highestListedSymbolInstanceIDs = new Map();
    this._tagNameToSymbolInstanceID = new Map();
    this._templateInstanceAttributes = new Map();
    this._templates = new Map();
    this._tags = new Map();
    
    // this._controllerAttributes = null;

    // if (options.optimize) {
    //   this.setupOptimizations(this, options.optimize);
    // }
  }

  // async setupOptimizations(layer, optimization) {
  //   layer._optimizing = new Promise(async function(resolve) {
  //     try {
  //       optimization = Object.assign({
  //         dir: __dirname
  //       }, optimization);

  //       layer._db = new DB(path.join(optimization.dir));

  //       const records = await layer._db.read();

  //       records.forEach(record => {
  //         switch (record.type) {
  //           case 'controllerAttributes':
  //             layer._controllerAttributes = record.payload;
  //             break;
  //           case 'templateInstanceAttributes':
  //             layer._templateInstanceAttributes.set(record.payload.id, record.payload.data);
  //             break;
  //           default:
  //             break;
  //         }
  //       });
  //     } catch (err) {
  //       console.log(err);
  //     } finally {
  //       resolve();
  //     }
  //   });
  // }

  // async resetAllSaved(layer) {
  //   layer._tagNameToSymbolInstanceID = new Map();
  //   layer._templates = new Map();
  //   layer._tags = new Map();
  //   layer._templateInstanceAttributes = new Map();
  //   layer._highestListedSymbolInstanceID = -1;

  //   if (layer._db) {
  //     await layer._db.clear();
  //   }
  // }

  // async setControllerAttributes(layer, attributes, save) {
  //   if (layer._controllerAttributes) {
  //     let shouldReset = false;
  //     if (layer._controllerAttributes.length !== attributes.length) {
  //       shouldReset = true;
  //     } else {
  //       for (let i = 0; i < layer._controllerAttributes.length; i++) {
  //         if (layer._controllerAttributes[i].value !== attributes[i].value) {
  //           shouldReset = true;
  //           break;
  //         }
  //       }
  //     }

  //     if (shouldReset) {
  //       await this.resetAllSaved(layer);
  //     }
  //   }

  //   // layer._controllerAttributes = attributes;

  //   // if (save) {
  //   //   layer._db.append({
  //   //     type: ''
  //   //   });
  //   // }
  // }
  

  // async test() {
  //   return this.exploreAttributes(EPath.Encode(0x72, 0x03));
  // }

  // async test2() {
  //   return this.request(0x4C, EPath.Encode(0x72, 0x00), Buffer.from([
  //     0x77, 0x6b, 0x08, 0x00, 0x01, 0x00
  //   ]));
  // }

  
  readTag2(scope, tag, elements, callback) {
    if (callback == null && typeof elements === 'function') {
      callback = elements;
      elements = undefined;
    }

    return CallbackPromise(callback, async resolver => {
      if (!tag) {
        return resolver.reject('Tag must be specified');
      }

      await this._optimizing;

      if (elements != null) {
        elements = parseInt(elements, 10);
        if (!Number.isFinite(elements) || elements <= 0 || elements > 0xFFFF) {
          return resolver.reject('If specified, elements must be a positive integer between 1 and 65535');
        }
      } else {
        elements = await getSymbolSize(this, scope, tag);
      }

      const service = SymbolServiceCodes.Read;
      const path = encodeFullSymbolPath(scope, tag);
      const data = Encode(DataTypes.UINT, elements);

      send(this, service, path, data, async (error, reply) => {
        if (error) {
          resolver.reject(error, reply);
        } else {
          let data;
          try {
            data = reply.status.code !== 6 ? reply.data : await readTagFragmented(this, path, elements);

            if (data.length === 0) {
              const tagInfo = await getSymbolInfo(this, scope, tag, [
                SymbolInstanceAttributeCodes.Type
              ]);

              const tagType = tagInfo[SymbolInstanceAttributeCodes.Type];

              let value;
              const tagName = typeof tag.name === 'string' ? tag.name : (typeof tag === 'string' ? tag : null);
              if (tagName && tagType && tagType.code === LDataTypeCodes.Program) {
                value = {};

                const listAttributes = [
                  SymbolInstanceAttributeCodes.Name,
                  SymbolInstanceAttributeCodes.Type
                ];

                for await (const programTag of listTags(this, listAttributes, tag, 0, false)) {
                  const programTagName = programTag[SymbolInstanceAttributeCodes.Name];
                  if (programTag[SymbolInstanceAttributeCodes.Type].system === false) {
                    value[programTagName] = await this.readTag2(tagName, programTagName);
                  } else {
                    value[programTagName] = undefined;
                  }
                }
              }

              resolver.resolve(value);
            } else {
              resolver.resolve(await parseReadTag(this, scope, tag, elements, data));
            }
          } catch (err) {
            console.log(err);
            console.log(data);
            resolver.reject(err, reply);
          }
        }
      }, 5000);
    });
  }


  readTag(tag, elements, callback) {
    if (callback == null && typeof elements === 'function') {
      callback = elements;
      elements = undefined;
    }

    return CallbackPromise(callback, async resolver => {
      if (!tag) {
        return resolver.reject('Tag must be specified');
      }

      await this._optimizing;

      if (elements != null) {
        elements = parseInt(elements, 10);
        if (!Number.isFinite(elements) || elements <= 0 || elements > 0xFFFF) {
          return resolver.reject('If specified, elements must be a positive integer between 1 and 65535');
        }
      } else {
        elements = await getSymbolSize(this, null, tag);
      }

      const service = SymbolServiceCodes.Read;
      const path = encodeSymbolPath(tag);
      const data = Encode(DataType.UINT, elements);

      send(this, service, path, data, async (error, reply) => {
        if (error) {
          resolver.reject(error, reply);
        } else {
          let data;
          try {
            data = reply.status.code !== 6 ? reply.data : await readTagFragmented(this, path, elements);

            if (data.length === 0) {
              const tagInfo = await getSymbolInfo(this, null, tag, [
                SymbolInstanceAttributeCodes.Type
              ]);

              const tagType = tagInfo[SymbolInstanceAttributeCodes.Type];

              let value;
              const tagName = typeof tag.name === 'string' ? tag.name : (typeof tag === 'string' ? tag : null);
              if (tagName && tagType && tagType.code === LDataTypeCodes.Program) {
                value = {};

                const listAttributes = [
                  SymbolInstanceAttributeCodes.Name,
                  SymbolInstanceAttributeCodes.Type
                ];

                for await (const programTag of listTags(this, listAttributes, tag, 0, false)) {
                  const programTagName = programTag[SymbolInstanceAttributeCodes.Name];
                  if (programTag[SymbolInstanceAttributeCodes.Type].system === false) {
                    value[programTagName] = await this.readTag(`${tagName}.${programTagName}`);
                  } else {
                    value[programTagName] = undefined;
                  }
                }
              }

              resolver.resolve(value);
            } else {
              resolver.resolve(await parseReadTag(this, null, tag, elements, data));
            }

            
          } catch (err) {
            console.log(err);
            console.log(data);
            resolver.reject(err, reply);
          }
        }
      }, 5000);
    });
  }


  writeTag(tag, value, callback) {
    return CallbackPromise(callback, async resolver => {
      if (!tag) {
        return resolver.reject('tag must be specified');
      }

      const tagInfo = await getSymbolInfo(this, null, tag, [
        SymbolInstanceAttributeCodes.Type
      ]);

      const tagType = tagInfo[SymbolInstanceAttributeCodes.Type];

      if (!tagInfo) {
        return resolver.reject(`Invalid tag: ${tag}`);
      }

      if (tagType.atomic !== true) {
        return resolver.reject(`Writing to structure tags is not currently supported`);
      }

      const dataType = tagType.code;
      const valueData = Encode(dataType, value);

      if (!Buffer.isBuffer(valueData)) {
        return resolver.reject(`Unable to encode data type: ${getDataTypeName(dataType)}`);
      }

      const service = SymbolServiceCodes.WriteTag;
      const path = encodeSymbolPath(tag);

      const data = Buffer.allocUnsafe(4 + valueData.length);
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
      const path = encodeSymbolPath(tag);

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


  async readSymbolAttributeList(scope, tag, attributes, callback) {
    if (arguments.length === 1) {
      tag = scope;
      scope = null;
    }

    if (arguments.length === 2) {
      if (typeof tag !== 'string') {
        tag = scope;
        scope = null;
      }
    }

    if (typeof attributes === 'function') {
      callback = attributes;
      attributes = undefined;
    }

    if (!Array.isArray(attributes)) {
      attributes = [1, 2, 3, 5, 6, 7, 8, 9, 10, 11];
    }

    return CallbackPromise(callback, async resolver => {
      const service = CommonServices.GetAttributeList;

      const symbolID = await getSymbolInstanceID(this, scope, tag);
      if (symbolID == null) {
        return resolver.reject(`Unable to determine symbol instance: ${scope ? `${scope}.` : ''}${tag}`);
      }

      const path = encodeFullSymbolPath(scope, symbolID);
      const data = encodeAttributes(attributes);

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

              if (status !== 0) {
                return resolver.reject(`Status for attribute ${code} is ${status}`);
              }

              const type = SymbolInstanceAttributeDataTypes[code];
              if (!type) {
                return resolver.reject(`Unknown attribute received: ${code}`);
              }

              let value;
              offset = Decode(type, data, offset, val => value = val);

              if (code === SymbolInstanceAttributeCodes.Type) {
                value = parseTypeCode(value);
              }

              attributeResults.push({
                name: SymbolInstanceAttributeNames[code] || 'Unknown',
                code,
                value
              });
            }

            resolver.resolve(attributeResults);
          } catch (err) {
            resolver.reject(err, reply);
          }
        }
      });
    });
  }


  async readSymbolAttributesAll(scope, tag, callback) {
    if (arguments.length === 1) {
      tag = scope;
      scope = null;
    }

    if (arguments.length === 2) {
      if (typeof tag !== 'string') {
        tag = scope;
        scope = null;
      }
    }

    return CallbackPromise(callback, async resolver => {
      const service = CommonServices.GetAttributesAll;

      const symbolID = await getSymbolInstanceID(this, scope, tag);
      if (symbolID == null) {
        return resolver.reject(`Unable to determine symbol instance: ${scope ? `${scope}.` : ''}${tag}`);
      }

      const path = encodeFullSymbolPath(scope, symbolID);

      send(this, service, path, null, (error, reply) => {
        if (error) {
          resolver.reject(error, reply);
        } else {
          try {
            const data = reply.data;
            let offset = 0;
            const attributes = [];

            function appendAttribute(code, modifier) {
              offset = Decode(SymbolInstanceAttributeDataTypes[code], data, offset, val => {
                attributes.push({
                  name: SymbolInstanceAttributeNames[code] || 'Unknown',
                  code,
                  value: typeof modifier === 'function' ? modifier(val) : val
                });
              });
            }

            /** Attribute 2 */
            appendAttribute(SymbolInstanceAttributeCodes.Type, parseTypeCode);

            /** Attribute 3 */
            appendAttribute(3);

            /** Attribute 1 */
            appendAttribute(SymbolInstanceAttributeCodes.Name);

            /** Attribute 5 */
            appendAttribute(5);

            /** Attribute 6 */
            appendAttribute(6);

            /** Attribute 7 */
            appendAttribute(SymbolInstanceAttributeCodes.Bytes);
            
            /** Attribute 8 */
            appendAttribute(SymbolInstanceAttributeCodes.ArrayDimensionLengths);

            // console.log(`OFFSET: ${offset} : ${data.length}`);

            resolver.resolve(attributes.sort(function(a, b) {
              if (a.code < b.code) return -1;
              else if (a.code > b.code) return 1;
              return 0;
            }));
          } catch (err) {
            resolver.reject(err, reply);
          }
        }
      });
    });
  }


  listTags(scope) {
    const attributes = [
      SymbolInstanceAttributeCodes.Name,
      SymbolInstanceAttributeCodes.Type
    ];

    return listTags(this, attributes, scope, 0, false, tagInfo => {
      return {
        name: tagInfo[SymbolInstanceAttributeCodes.Name],
        type: tagInfo[SymbolInstanceAttributeCodes.Type]
      };
    });
  }


  readTemplate(templateID, forceRefresh, callback) {
    if (typeof forceRefresh === 'function' && callback == null) {
      callback = forceRefresh;
      forceRefresh = false;
    }

    return CallbackPromise(callback, async resolver => {
      try {
        if (forceRefresh !== true && this._templates.has(templateID)) {
          return resolver.resolve(this._templates.get(templateID));
        }

        const service = TemplateServiceCodes.Read;
        const path = EPath.Encode(
          ClassCodes.Template,
          templateID
        );

        let attributes;
        if (this._templateInstanceAttributes.has(templateID)) {
          attributes = this._templateInstanceAttributes.get(templateID);
        } else {
          attributes = await this.readTemplateInstanceAttributes(templateID);
        }

        if (attributes == null) {
          return resolver.reject(`Unable to read template attributes for template: ${templateID}`);
        }

        /** Documentation says the header is 23 bytes, I'm pretty sure it is only 20 bytes */
        const bytesToRead = attributes[TemplateInstanceAttributeCodes.DefinitionSize] * 4 - 20; // 23;
        const reqData = Buffer.allocUnsafe(6);
        const chunks = [];
        
        let reqOffset = 0;

        while (true) {
          reqData.writeUInt32LE(reqOffset, 0);
          reqData.writeUInt16LE(bytesToRead - reqOffset, 4);
          const reply = await sendPromise(this, service, path, reqData, 5000);
          chunks.push(reply.data);

          if (reply.status.code === 6) {
            reqOffset += reply.data.length;
          } else {
            break;
          }
        }

        const data = Buffer.concat(chunks);

        const dataLength = data.length;
        const members = [];

        let offset = 0;
        for (let i = 0; i < attributes[TemplateInstanceAttributeCodes.MemberCount]; i++) {
          if (offset < dataLength - 8) {
            const info = data.readUInt16LE(offset); offset += 2;
            const type = data.readUInt16LE(offset); offset += 2;
            const memberOffset = data.readUInt32LE(offset); offset += 4;
            members.push({
              info,
              offset: memberOffset,
              type: parseTypeCode(type)
            });
          }
        }

        let structureName, nameExtra;
        offset = parseTemplateNameInfo(data, offset, info => {
          structureName = info.name;
          nameExtra = info.extra
        });

        /** Read the member names */
        for (let i = 0; i < members.length; i++) {
          const member = members[i];
          offset = parseTemplateMemberName(data, offset, name => member.name = name);
          if (member.type.code === DataTypeCodes.SINT && member.name.indexOf('ZZZZZZZZZZ') === 0) {
            /** Member is a host member for holding boolean members */
            // console.log(`HOST: ${member.name}`);
            // console.log(member);
            member.host = true;
          }
        }

        const template = {
          name: structureName,
          nameExtra,
          members: members.filter(member => !member.host),
          extra: data.slice(offset),
          extraAscii: data.slice(offset).toString('ascii')
        };

        this._templates.set(templateID, template);

        resolver.resolve(template);
      } catch (err) {
        resolver.reject(err);
      }
    });
  }


  readTemplateInstanceAttributes(templateID, forceRefresh, callback) {
    if (typeof forceRefresh === 'function' && callback == null) {
      callback = forceRefresh;
      forceRefresh = false;
    }

    return CallbackPromise(callback, resolver => {
      try {
        if (forceRefresh !== true && this._templateInstanceAttributes.has(templateID)) {
          return resolver.resolve(this._templateInstanceAttributes.get(templateID));
        }

        const service = CommonServices.GetAttributeList;

        const path = EPath.Encode(
          ClassCodes.Template,
          templateID
        );

        const data = encodeAttributes([
          TemplateInstanceAttributeCodes.StructureHandle,
          TemplateInstanceAttributeCodes.MemberCount,
          TemplateInstanceAttributeCodes.DefinitionSize,
          TemplateInstanceAttributeCodes.StructureSize
        ]);

        send(this, service, path, data, (error, reply) => {
          if (error) {
            resolver.reject(error, reply);
          } else {
            try {
              const { data } = reply;

              let offset = 0;
              const attributeCount = data.readUInt16LE(offset); offset += 2;
              const attributes = {};

              for (let i = 0; i < attributeCount; i++) {
                let attribute, status;
                offset = Decode(DataType.UINT, data, offset, val => attribute = val);
                offset = Decode(DataType.UINT, data, offset, val => status = val);

                const attributeDataType = TemplateInstanceAttributeDataTypes[attribute];

                if (attributeDataType == null) {
                  throw new Error(`Unknown template attribute received: ${attribute}`);
                }

                if (status === 0) {
                  offset = Decode(attributeDataType, data, offset, val => {
                    attributes[attribute] = val;
                  });
                } else {
                  throw new Error(`Attribute ${attribute} has error status: ${GenericServiceStatusDescriptions[status] || 'Unknown'}`);
                }
              }

              this._templateInstanceAttributes.set(templateID, attributes);
              resolver.resolve(attributes);
            } catch (err) {
              resolver.reject(err, reply);
            }
          }
        });
      } catch (err) {
        resolver.reject(err);
      }
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

      const data = encodeAttributes([1, 2, 3, 4, 10]);

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


  handleData(data, info, context) {
    if (context == null) {
      throw new Error('Logix5000 Error: Unhandled message, context should not be null.');
    }

    const callback = this.callbackForContext(context);
    if (callback != null) {
      callback(null, data, info);
    } else {
      console.log('Logix5000 Warning: Unhandled data received.');
      console.log(data);
    }
  }
}

module.exports = Logix5000;


async function readTagFragmented(layer, path, elements) {
  const service = SymbolServiceCodes.ReadFragmented;

  const reqData = Buffer.allocUnsafe(6);
  reqData.writeUInt16LE(elements, 0);

  let offset = 0;
  const chunks = [];

  while (true) {
    reqData.writeUInt32LE(offset, 2);
    const reply = await sendPromise(layer, service, path, reqData, 5000);

    /** remove the tag type bytes if already received */
    const dataTypeOffset = DecodeDataType(reply.data, 0);
    chunks.push(chunks.length > 0 ? reply.data.slice(dataTypeOffset) : reply.data);

    if (reply.status.code === 0x06) {
      offset = reply.data.length - dataTypeOffset;
    } else if (reply.status.code === 0) {
      break;
    } else {
      throw new InfoError(reply, getError(reply));
    }
  }

  return Buffer.concat(chunks);
}


async function parseReadTagMemberStructure(layer, structureType, data, offset) {
  if (!structureType.template) {
    throw new Error(`Tried to read template without id`);
  }

  const template = await layer.readTemplate(structureType.template.id);
  if (!template || !Array.isArray(template.members)) {
    return new Error(`Unable to read template: ${structureType.template.id}`);
  }

  // console.log(template);

  const members = template.members;

  const structValues = {};
  for (let i = 0; i < members.length; i++) {
    const member = members[i];
    // console.log(member);
    if (member.type.atomic) {
      if (member.type.dimensions === 0) {
        Decode({ code: member.type.code, info: member.info }, data, offset + member.offset, value => structValues[member.name] = value);
      } else if (member.type.dimensions === 1) {
        const memberValues = [];
        let nextOffset = offset + member.offset;
        for (let memberArrIndex = 0; memberArrIndex < member.info; memberArrIndex++) {
          nextOffset = Decode(member.type.code, data, nextOffset, value => memberValues.push(value));
        }
        structValues[member.name] = memberValues;
      } else {
        console.log(member);
        throw new Error('Currently unable to read members with dimensions other than 0 or 1');
      }
    } else {
      structValues[member.name] = await parseReadTagMemberStructure(layer, member.type, data, offset + member.offset);
    }
  }
  return structValues;
}


async function parseReadTag(layer, scope, tag, elements, data) {
  if (data.length === 0) {
    return undefined;
  }

  let typeInfo;
  let offset = DecodeDataType(data, 0, val => typeInfo = val);
  // console.log(typeInfo);

  const values = [];

  if (!typeInfo.constructed || typeInfo.abbreviated === false) {
    for (let i = 0; i < elements; i++) {
      offset = Decode(typeInfo, data, offset, value => values.push(value));
    }
  } else {
    const tagInfo = await getSymbolInfo(layer, scope, tag, [
      SymbolInstanceAttributeCodes.Type
    ]);

    const tagType = tagInfo[SymbolInstanceAttributeCodes.Type];

    if (!tagType) {
      throw new Error(`Invalid tag: ${tag}`);
    }

    switch (tagType.code) {
      case LDataTypeCodes.Map:
      case LDataTypeCodes.Cxn:
      case LDataTypeCodes.Program:
      case LDataTypeCodes.Routine:
      case LDataTypeCodes.Task:
        throw new Error(`Unable to directly read type ${LDatatypeNames[tagType.code].toUpperCase()}: ${tag}`);
      default:
        break;
    }

    values.push(await parseReadTagMemberStructure(layer, tagType, data, offset));

    // try {
    //   values.push(await parseReadTagMemberStructure(layer, tagType, data, offset));
    // } catch (err) {
    //   console.log(tag.name || tag);
    //   console.log(typeInfo);
    //   console.log(tagInfo);
    //   console.log(data.slice(0, 20));
    //   throw err;
    // }
  }

  if (elements === 1) {
    return values[0];
  }

  return values;
}


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


function encodeAttributes(attributes) {
  const data = Buffer.allocUnsafe(2 + attributes.length * 2);
  data.writeUInt16LE(attributes.length, 0);
  for (let i = 0; i < attributes.length; i++) {
    data.writeUInt16LE(attributes[i], 2 * (i + 1));
  }
  return data;
}


function encodeSymbolPath(tag) {
  switch (typeof tag) {
    case 'string':
      return EPath.EncodeANSIExtSymbol(tag);
    case 'number':
      return EPath.Encode(ClassCodes.Symbol, tag);
    case 'object':
      return EPath.EncodeANSIExtSymbol(tag.name);
      // return EPath.Encode(ClassCodes.Symbol, tag.id);
    default:
      throw new Error('Tag must be a tag name, symbol instance number, or a tag object');
  }
}


function encodeFullSymbolPath(scope, symbol) {
  const symbolPath = encodeSymbolPath(symbol);

  if (scope) {
    return Buffer.concat([
      EPath.EncodeANSIExtSymbol(scope),
      symbolPath
    ]);
  }

  return symbolPath;
}


function parseListTagsResponse(reply, attributes, tags, modifier) {
  const data = reply.data;
  const length = data.length;

  const hasModifier = typeof modifier === 'function';

  let offset = 0;
  let lastInstanceID = 0;

  while (offset < length) {
    const tag = {};

    offset = Decode(DataType.UDINT, data, offset, val => tag.id = val);
    lastInstanceID = tag.id;

    for (let i = 0; i < attributes.length; i++) {
      const attribute = attributes[i];
      const attributeDataType = SymbolInstanceAttributeDataTypes[attribute];
      switch (attribute) {
        case SymbolInstanceAttributeCodes.Name:
          offset = Decode(attributeDataType, data, offset, val => tag[attribute] = val);
          break;
        case SymbolInstanceAttributeCodes.Type:
          offset = Decode(attributeDataType, data, offset, val => tag[attribute] = parseTypeCode(val));
          break;
        case SymbolInstanceAttributeCodes.ArrayDimensionLengths: {
          tag[attribute] = [];
          for (let j = 0; j < 3; j++) {
            offset = Decode(DataTypes.UDINT, data, offset, val => tag[attribute].push(val));
          }
          break;
        }
        case SymbolInstanceAttributeCodes.Bytes:
          offset = Decode(attributeDataType, data, offset, val => tag[attribute] = val);
          break;
        default:
          throw new Error(`Unknown attribute: ${attributes[i]}`);
      }
    }

    if (hasModifier) {
      tags.push(modifier(tag));
    } else {
      tags.push(tag);
    }
  }

  return lastInstanceID;
}


function parseTypeCode(code) {
  const res = {};
  // res.raw = code;
  res.atomic = getBit(code, 15) === 0;
  res.system = !!getBit(code, 12);
  res.dimensions = getBits(code, 13, 15);

  if (res.atomic) {
    res.code = getBits(code, 0, 8);
    if (res.code === DataTypeCodes.BOOL) {
      res.position = getBits(code, 8, 11);
    }
    res.name = getDataTypeName(res.code);
  } else {
    const templateID = getBits(code, 0, 12);
    res.template = {
      id: templateID
    };
    res.name = 'Structure';
  }

  return res;
}


function getDataTypeName(code) {
  return DataTypeNames[code] || LDatatypeNames[code] || 'Unknown';
}


function parseTemplateMemberName(data, offset, cb) {
  const nullIndex = data.indexOf(0x00, offset);

  if (nullIndex >= 0) {
    cb(data.toString('ascii', offset, nullIndex));
    return nullIndex + 1;
  }

  cb(`(${data.toString('ascii', offset)})`);
  return data.length;
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


function getError(reply) {
  if (reply.status.description) {
    return reply.status.description;
  }

  let error = GenericServiceStatusDescriptions[reply.status.code];
  if (typeof error === 'object') {
    if (Buffer.isBuffer(reply.status.additional) && reply.status.additional.length >= 2) {
      error = error[reply.status.additional.readUInt16LE(0)];
    }
  }

  reply.status.description = error || 'Unknown Logix5000 error';

  return reply.status.description;
}


async function getSymbolInfo(layer, scope, tagInput, attributes) {
  const info = {};

  if (!Array.isArray(attributes)) {
    return info;
  }

  const symbolInstanceID = await getSymbolInstanceID(layer, scope, tagInput);
  if (symbolInstanceID == null) {
    return info;
  }

  const scopeKey = scope ? `${scope}::` : '';

  function buildSymbolAttributeKey(symbolID, attribute) {
    return `${scopeKey}${symbolID}::${attribute}`;
  }

  const newAttributes = [];

  attributes.forEach(attribute => {
    const symbolAttributeKey = buildSymbolAttributeKey(symbolInstanceID, attribute);
    if (layer._tags.has(symbolAttributeKey)) {
      info[attribute] = layer._tags.get(symbolAttributeKey);
    } else {
      newAttributes.push(attribute);
    }
  });

  if (newAttributes.length > 0) {
    for await (const tags of listTags(layer, newAttributes, scope, symbolInstanceID, true)) {
      for (let i = 0; i < tags.length; i++) {
        const tag = tags[i];
        newAttributes.forEach(attribute => {
          layer._tags.set(buildSymbolAttributeKey(tag.id, attribute), tag[attribute]);

          if (tag.id === symbolInstanceID) {
            info[attribute] = tag[attribute];
          }
        });
      }
      break;
    }
  }

  return info;
}


async function getSymbolInstanceID(layer, scope, tag) {
  let tagName;
  switch (typeof tag) {
    case 'string':
      tagName = tag;
      break;
    case 'number':
      return tag;
    case 'object':
      return tag.id;
    default:
      throw new Error('Tag must be a tag name, symbol instance number, or a tag object. Received: ${');
  }

  const scopeKey = scope ? `${scope}::` : '';
  const tagNameToSymbolInstanceIDKey = `${scopeKey}${tagName}`;

  if (layer._tagNameToSymbolInstanceID.has(tagNameToSymbolInstanceIDKey)) {
    return layer._tagNameToSymbolInstanceID.get(tagNameToSymbolInstanceIDKey);
  }
  
  let instanceID = -1;

  const highestListedSymbolInstanceIDScope = scope || DEFAULT_SCOPE;
  if (layer._highestListedSymbolInstanceIDs.has(highestListedSymbolInstanceIDScope)) {
    instanceID = layer._highestListedSymbolInstanceIDs.get(highestListedSymbolInstanceIDScope);
  }

  for await (const tags of listTags(layer, [SymbolInstanceAttributeCodes.Name], scope, instanceID + 1, true)) {
    for (let i = 0; i < tags.length; i++) {
      const tag = tags[i];
      const fullName = `${scopeKey}${tag[SymbolInstanceAttributeCodes.Name]}`;
      layer._tagNameToSymbolInstanceID.set(fullName, tag.id);
      layer._highestListedSymbolInstanceIDs.set(fullName, tag.id);
    }

    if (layer._tagNameToSymbolInstanceID.has(tagNameToSymbolInstanceIDKey)) {
      return layer._tagNameToSymbolInstanceID.get(tagNameToSymbolInstanceIDKey);
    }
  }
}


async function* listTags(layer, attributes, scope, instance, shouldGroup, modifier) {
  let instanceID = instance != null ? instance : 0;

  const MIN_TIMEOUT = 700;
  const MAX_TIMEOUT = 5000;
  const MAX_RETRY = 5;

  let timeout = MIN_TIMEOUT;

  const service = SymbolServiceCodes.GetInstanceAttributeList;
  const data = encodeAttributes(attributes);

  let retry = 0;

  while (true) {
    const path = encodeFullSymbolPath(scope, instanceID);

    let reply;

    if (retry <= MAX_RETRY) {
      try {
        reply = await sendPromise(layer, service, path, data, timeout);
      } catch (err) {
        retry++;
        console.log(err);
      }

      if (reply) {
        retry = 0;
        timeout = MIN_TIMEOUT;

        const tags = [];
        const lastInstanceID = parseListTagsResponse(reply, attributes, tags, modifier);

        if (shouldGroup) {
          yield tags;
        } else {
          for (let i = 0; i < tags.length; i++) {
            yield tags[i];
          }
        }

        if (reply.status.code === 0 || tags.length <= 0) {
          break;
        }

        instanceID = lastInstanceID + 1;
      } else {
        // console.log(`retrying: ${retry}, ${instanceID}`);
        timeout *= 2;
        timeout = timeout > MAX_TIMEOUT ? MAX_TIMEOUT : timeout;
      }
      
    } else {
      break;
    }
  }
}

// async function* listTags(layer, attributes, scope, instance, shouldGroup, modifier) {
//   let instanceID = instance != null ? instance : 0;
  
//   const MIN_TIMEOUT = 700;
//   const MAX_TIMEOUT = 5000;
//   const MAX_RETRY = 5;

//   let timeout = MIN_TIMEOUT;

//   const service = SymbolServiceCodes.GetInstanceAttributeList;
//   const data = encodeAttributes(attributes);

//   let retry = 0;

//   while (true) {
//     const path = encodeFullSymbolPath(scope, instanceID);

//     let reply;
    
//     if (retry <= MAX_RETRY) {
//       try {
//         if (retry > 0) {
//           console.log(`retrying: ${retry}, ${instanceID}`);
//           timeout *= 2;
//           timeout = timeout > MAX_TIMEOUT ? MAX_TIMEOUT : timeout;
//         }

//         const reply = await sendPromise(layer, service, path, data, timeout);

//         retry = 0;
//         timeout = MIN_TIMEOUT;

//         const tags = [];
//         const lastInstanceID = parseListTagsResponse(reply, attributes, tags, modifier);

//         if (shouldGroup) {
//           yield tags;
//         } else {
//           for (let i = 0; i < tags.length; i++) {
//             yield tags[i];
//           }
//         }

//         if (reply.status.code === 0 || tags.length <= 0) {
//           break;
//         }

//         instanceID = lastInstanceID + 1;
//         console.log(instanceID);
//       } catch (err) {
//         retry++;
//         console.log(err);
//       }
//     } else {
//       break;
//     }
//   }
// }


async function getSymbolSize(layer, scope, tag) {
  if (typeof tag === 'string' && /\[\d+\]$/.test(tag) === false) {
    try {
      const symbolParts = tag.split('.');
      if (symbolParts.length === 1) {
        const [
          typeInfo,
          arrayDimensionLengthsInfo
        ] = await layer.readSymbolAttributeList(scope, symbolParts[0], [
          SymbolInstanceAttributeCodes.Type,
          SymbolInstanceAttributeCodes.ArrayDimensionLengths
        ]);

        // TODO: Update this section when reading multidimensional arrays is figured out
        if (typeInfo.value && typeInfo.value.dimensions === 1) {
          if (Array.isArray(arrayDimensionLengthsInfo.value) && arrayDimensionLengthsInfo.value.length > 0) {
            // console.log(`SIZE: ${tag}: RETURNING DIMENSION LENGTH FROM TYPE INFO: ${arrayDimensionLengthsInfo.value[0]}`);
            return arrayDimensionLengthsInfo.value[0];
          }
        }
      } else {
        let symbolPartStartIdx = 1;
        const tagInfo = await getSymbolInfo(layer, scope, symbolParts[0], [
          SymbolInstanceAttributeCodes.Type
        ]);

        const tagType = tagInfo[SymbolInstanceAttributeCodes.Type];

        if (tagType && tagType.code === LDataTypeCodes.Program) {
          return getSymbolSize(layer, symbolParts[0], symbolParts.slice(1).join('.'));
        }

        let memberInfo;

        if (tagType && tagType.template && tagType.template.id != null) {
          let template;
          let templateID = tagType.template.id;

          for (let i = symbolPartStartIdx; i < symbolParts.length; i++) {
            let symbolPart = symbolParts[i];
            let symbolPartElementIndex = symbolPart.indexOf('[');
            if (symbolPartElementIndex >= 0) {
              symbolPart = symbolPart.substring(0, symbolPartElementIndex);
            }

            template = await layer.readTemplate(templateID);
            templateID = null;
            memberInfo = null;

            if (template && Array.isArray(template.members)) {
              for (let memberIdx = 0; memberIdx < template.members.length; memberIdx++) {
                const member = template.members[memberIdx];

                if (member.name === symbolPart) {
                  memberInfo = member;
                  if (member.type && member.type.template && member.type.template.id != null) {
                    templateID = member.type.template.id;
                  }
                  break;
                }
              }
            }
            if (templateID == null) {
              break;
            }
          }

          // TODO: Update this section when reading multidimensional arrays is figured out
          if (memberInfo && memberInfo.type && memberInfo.type.dimensions === 1) {
            // console.log(`SIZE: ${tag}: RETURNING DIMENSION LENGTH FROM MEMBER: ${memberInfo.info}`);
            return memberInfo.info;
          }
        }
      }

    } catch (err) {
      // Ignore error
      console.log(err);
    }
  }
  // console.log(`SIZE: ${tag}: RETURNING DIMENSION LENGTH 1`);
  return 1;
}