'use strict';

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
  DataTypes,
  DataTypeNames,
  Encode,
  Decode,
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

    this._highestListedSymbolInstanceID = -1;
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


  readTag(tag, elements, callback) {
    if (callback == null && typeof elements === 'function') {
      callback = elements;
      elements = undefined;
    }

    return CallbackPromise(callback, async resolver => {
      if (!tag) {
        return resolver.reject('Tag must be specified');
      }

      const elementsSpecified = elements != null;

      if (elementsSpecified && (!Number.isFinite(elements) || elements <= 0 || elements > 0xFFFF)) {
        return resolver.reject('If specified, elements must be a positive integer between 1 and 65535');
      }

      elements = parseInt(elements, 10);
      if (elements <= 0 || elements > 0xFFFF) {
        return resolver.reject('If specified, elements must be a positive integer between 1 and 65535');
      }

      await this._optimizing;

      // TODO: Update this section when reading multidimensional arrays is figured out
      if (!elementsSpecified) {
        elements = 1;

        /** Don't read more than one element if tag specifies accessing array element */
        if (typeof tag === 'string' && /\[\d+\]$/.test(tag) === false) {
          try {
            const symbolParts = tag.split('.');
            if (symbolParts.length === 1) {
              const [
                typeInfo,
                arrayDimensionLengthsInfo
              ] = await this.readSymbolAttributeList(symbolParts[0], [
                SymbolInstanceAttributeCodes.Type,
                SymbolInstanceAttributeCodes.ArrayDimensionLengths
              ]);

              if (typeInfo.value && typeInfo.value.dimensions === 1) {
                if (Array.isArray(arrayDimensionLengthsInfo.value) && arrayDimensionLengthsInfo.value.length > 0) {
                  elements = arrayDimensionLengthsInfo.value[0];
                }
              }
            } else {
              const tagInfo = await getTagInfo(this, symbolParts[0]);
              // console.log(tagInfo);

              let memberInfo;

              if (tagInfo && tagInfo.type && tagInfo.type.template && tagInfo.type.template.id != null) {
                let template;
                let templateID = tagInfo.type.template.id;

                for (let i = 1; i < symbolParts.length; i++) {
                  let symbolPart = symbolParts[i];
                  let symbolPartElementIndex = symbolPart.indexOf('[');
                  if (symbolPartElementIndex >= 0) {
                    symbolPart = symbolPart.substring(0, symbolPartElementIndex);
                  }

                  template = await this.readTemplate(templateID);
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
                
                if (memberInfo && memberInfo.type && memberInfo.type.dimensions === 1) {
                  elements = memberInfo.info;
                }
              }
            }
            
          } catch (err) {
            // Ignore error
            // console.log(err);
          }

          // try {
          //   const [
          //     typeInfo,
          //     arrayDimensionLengthsInfo
          //   ] = await this.readSymbolAttributeList(tag, [
          //     SymbolInstanceAttributeCodes.Type,
          //     SymbolInstanceAttributeCodes.ArrayDimensionLengths
          //   ]);

          //   if (typeInfo.value && typeInfo.value.dimensions === 1) {
          //     if (Array.isArray(arrayDimensionLengthsInfo.value) && arrayDimensionLengthsInfo.value.length > 0) {
          //       elements = arrayDimensionLengthsInfo.value[0];
          //     }
          //   }
          // } catch (err) {
          //   // Ignore error
          //   console.log(err);
          // }
        }
      }

      const service = SymbolServiceCodes.Read;
      const path = encodeTagPath(tag);
      const data = Encode(DataTypes.UINT, elements);

      send(this, service, path, data, async (error, reply) => {
        if (error) {
          resolver.reject(error, reply);
        } else {
          let data;
          try {
            data = reply.status.code !== 6 ? reply.data : await readTagFragmented(this, path, elements);
            resolver.resolve(await parseReadTag(this, tag, elements, data));
          } catch (err) {
            console.log(err);
            console.log(data);
            resolver.reject(err, reply);
          }
        }
      }, 5000);
    });
  }

  // readTag(tag, elements, callback) {
  //   if (callback == null && typeof elements === 'function') {
  //     callback = elements;
  //   }

  //   if (!Number.isFinite(elements)) {
  //     elements = 1;
  //   }

  //   return CallbackPromise(callback, async resolver => {
  //     if (!tag) {
  //       return resolver.reject('Tag must be specified');
  //     }

  //     elements = parseInt(elements, 10);
  //     if (elements <= 0 || elements > 0xFFFF) {
  //       return resolver.reject('If specified, elements must be a positive integer between 1 and 65535');
  //     }

  //     const service = SymbolServiceCodes.Read;
  //     const path = encodeTagPath(tag);
  //     const data = Encode(DataTypes.UINT, elements);

  //     send(this, service, path, data, async (error, reply) => {
  //       if (error) {
  //         resolver.reject(error, reply);
  //       } else {
  //         let data;
  //         try {
  //           data = reply.status.code !== 6 ? reply.data : await readTagFragmented(this, path, elements);
  //           resolver.resolve(await parseReadTag(this, tag, elements, data));
  //         } catch (err) {
  //           console.log(err);
  //           console.log(data);
  //           resolver.reject(err, reply);
  //         }
  //       }
  //     }, 5000);
  //   });
  // }


  writeTag(tag, value, callback) {
    return CallbackPromise(callback, async resolver => {
      if (!tag) {
        return resolver.reject('tag must be specified');
      }

      const tagInfo = await getTagInfo(this, tag);
      if (!tagInfo) {
        return resolver.reject(`Invalid tag: ${tag}`);
      }

      if (tagInfo.type.atomic !== true) {
        return resolver.reject(`Writing to structure tags is not currently supported`);
      }

      const dataType = tagInfo.type.code;

      const valueData = Encode(dataType, value);

      if (!Buffer.isBuffer(valueData)) {
        return resolver.reject(`Unable to encode data type: ${getDataTypeName(dataType)}`);
      }

      const service = SymbolServiceCodes.WriteTag;

      const path = encodeTagPath(tag);

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


  // async readAttributeList(input, attributes, callback) {
  //   if (typeof attributes === 'function') {
  //     callback = attributes;
  //     attributes = undefined;
  //   }

  //   if (!Array.isArray(attributes)) {
  //     attributes = [1, 2, 3, 5, 6, 7, 8, 9, 10, 11];
  //   }
  // }


  async readSymbolAttributeList(tag, attributes, callback) {
    if (typeof attributes === 'function') {
      callback = attributes;
      attributes = undefined;
    }

    if (!Array.isArray(attributes)) {
      attributes = [1, 2, 3, 5, 6, 7, 8, 9, 10, 11];
    }

    return CallbackPromise(callback, async resolver => {
      const service = CommonServices.GetAttributeList;

      const symbolID = await getTagSymbolInstanceID(this, tag);
      if (symbolID == null) {
        return resolver.reject(`Unable to determine symbol instance for tag: ${tag}`);
      }

      const path = encodeTagPath(symbolID);
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
              let name, value;
              switch (code) {
                case SymbolInstanceAttributeCodes.Name:
                  name = SymbolInstanceAttributeNames[code];
                  offset = Decode(SymbolInstanceAttributeDataTypes[code], data, offset, val => value = val);
                  break;
                case SymbolInstanceAttributeCodes.Type:
                  name = SymbolInstanceAttributeNames[code];
                  offset = Decode(SymbolInstanceAttributeDataTypes[code], data, offset, val => value = parseTypeCode(val));
                  break;
                case 3:
                  name = 'Unknown';
                  value = data.slice(offset, offset + 4);
                  offset += 4;
                  break;
                // case 4:
                //   // Status is non-zero
                case 5:
                  name = 'Unknown';
                  value = data.slice(offset, offset + 4);
                  offset += 4;
                  break;
                case 6:
                  name = 'Unknown';
                  value = data.slice(offset, offset + 4);
                  offset += 4;
                  break;
                case SymbolInstanceAttributeCodes.Bytes:
                  name = SymbolInstanceAttributeNames[code];
                  offset = Decode(SymbolInstanceAttributeDataTypes[code], data, offset, val => value = val);
                  break;
                case SymbolInstanceAttributeCodes.ArrayDimensionLengths:
                  name = SymbolInstanceAttributeNames[code];
                  value = data.slice(offset, offset + 12);
                  value = [];
                  for (let j = 0; j < 3; j++) {
                    offset = Decode(DataTypes.DINT, data, offset, val => value.push(val));
                  }
                  break;
                case 9:
                  name = 'Unknown';
                  value = data.slice(offset, offset + 1);
                  offset += 1;
                  break;
                case 10:
                  name = 'Unknown';
                  value = data.slice(offset, offset + 1);
                  offset += 1;
                  break;
                case 11:
                  name = 'Unknown';
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

            // reply.attributes = attributeResults;

            resolver.resolve(attributeResults);
          } catch (err) {
            resolver.reject(err, reply);
          }
        }
      });
    });
  }


  async readSymbolAttributesAll(tag, callback) {
    return CallbackPromise(callback, async resolver => {
      const service = CommonServices.GetAttributesAll;

      const symbolID = await getTagSymbolInstanceID(this, tag);
      if (symbolID == null) {
        return resolver.reject(`Unable to determine symbol instance for tag: ${tag}`);
      }

      const path = encodeTagPath(symbolID);

      send(this, service, path, null, (error, reply) => {
        if (error) {
          resolver.reject(error, reply);
        } else {
          try {
            const data = reply.data;

            let offset = 0;
            let attributeCode;

            const attributes = [];

            // console.log(data);

            /** Attribute 2 */
            attributeCode = SymbolInstanceAttributeCodes.Type;
            offset = Decode(SymbolInstanceAttributeDataTypes[attributeCode], data, offset, val => {
              attributes.push({
                name: SymbolInstanceAttributeNames[attributeCode],
                code: attributeCode,
                value: parseTypeCode(val)
              });
            });

            /** Attribute 3 */
            attributes.push({
              name: 'Unknown',
              code: 3,
              value: data.slice(offset, offset + 4)
            });
            offset += 4;

            /** Attribute 1 */
            attributeCode = SymbolInstanceAttributeCodes.Name;
            offset = Decode(SymbolInstanceAttributeDataTypes[attributeCode], reply.data, 6, val => {
              attributes.push({
                name: SymbolInstanceAttributeNames[attributeCode],
                code: attributeCode,
                value: val
              });
            });

            /** Attribute 5 */
            attributes.push({
              name: 'Unknown',
              code: 5,
              value: data.slice(offset, offset + 4)
            });
            offset += 4;

            /** Attribute 6 */
            attributes.push({
              name: 'Unknown',
              code: 6,
              value: data.slice(offset, offset + 4)
            });
            offset += 4;

            /** Attribute 7 */
            attributeCode = SymbolInstanceAttributeCodes.Bytes;
            offset = Decode(SymbolInstanceAttributeDataTypes[attributeCode], data, offset, val => {
              attributes.push({
                name: SymbolInstanceAttributeNames[attributeCode],
                code: attributeCode,
                value: val
              });
            });
            
            /** Attribute 8 */
            attributeCode = SymbolInstanceAttributeCodes.ArrayDimensionLengths;
            const arrayDimensionLengths = [];
            for (let i = 0; i < 3; i++) {
              offset = Decode(DataTypes.UDINT, data, offset, val => {
                arrayDimensionLengths.push(val);
              });
            }
            attributes.push({
              name: SymbolInstanceAttributeNames[attributeCode],
              code: attributeCode,
              value: arrayDimensionLengths
            });

            // console.log(`OFFSET: ${offset} : ${data.length}`);

            resolver.resolve(attributes);
          } catch (err) {
            resolver.reject(err, reply);
          }
        }
      });
    });
  }


  listTags(program) {
    const attributes = [
      SymbolInstanceAttributeCodes.Name,
      SymbolInstanceAttributeCodes.Type
    ];
    return listTags(this, attributes, program, 0);
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

        let attributes = this._templateInstanceAttributes.get(templateID);
        if (attributes == null) {
          attributes = await this.readTemplateInstanceAttributes(templateID);
        }

        /** Documentation says the header is 23 bytes, I'm pretty sure it is only 20 bytes */
        const bytesToRead = attributes[TemplateInstanceAttributeCodes.DefinitionSize] * 4 - 20; // 23;

        let reqOffset = 0;

        const reqData = Buffer.allocUnsafe(6);
        
        const chunks = [];

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

        /** Read the template name and extra characters after ';' */
        let structureName;
        let nameExtra;
        offset = parseTemplateNameInfo(data, offset, info => {
          structureName = info.name;
          nameExtra = info.extra
        });

        /** Read the member names */
        for (let i = 0; i < members.length; i++) {
          const member = members[i];
          offset = parseTemplateMemberName(data, offset, name => member.name = name);
          if (member.type.code === DataTypes.SINT && member.name.indexOf('ZZZZZZZZZZ') === 0) {
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
                offset = Decode(DataTypes.UINT, data, offset, val => attribute = val);
                offset = Decode(DataTypes.UINT, data, offset, val => status = val);

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
    const dataTypeOffset = decodeReadTagType(reply.data, 0);
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


function decodeReadTagType(data, offset, cb) {
  let code;
  offset = Decode(DataTypes.UINT, data, offset, val => code = val);

  let atomic = true, structureHandle;
  if (code === DataTypes.STRUCT) {
    atomic = false;
    offset = Decode(DataTypes.UINT, data, offset, val => structureHandle = val);
  }

  if (typeof cb === 'function') {
    cb({
      code,
      atomic,
      structureHandle
    });
  }

  return offset;
}


async function parseReadTagMemberStructure(layer, structure, data, offset) {
  if (!structure.type.template) {
    throw new Error(`Tried to read template without id`);
  }

  const template = await layer.readTemplate(structure.type.template.id);
  if (!template || !Array.isArray(template.members)) {
    return new Error(`Unable to read template: ${structure.type.template.id}`);
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
      structValues[member.name] = await parseReadTagMemberStructure(layer, member, data, offset + member.offset);
    }
  }
  return structValues;
}


async function parseReadTag(layer, tag, elements, data) {
  // console.log(data);
  if (data.length === 0) {
    return undefined;
  }

  let typeInfo;
  let offset = decodeReadTagType(data, 0, val => typeInfo = val);

  const values = [];

  if (typeInfo.atomic) {
    for (let i = 0; i < elements; i++) {
      offset = Decode(typeInfo.code, data, offset, value => values.push(value));
    }
  } else {
    const tagInfo = await getTagInfo(layer, tag);

    if (!tagInfo) {
      throw new Error(`Invalid tag: ${tag}`);
    }

    switch (tagInfo.type.code) {
      case LDataTypeCodes.Map:
      case LDataTypeCodes.Cxn:
      case LDataTypeCodes.Program:
      case LDataTypeCodes.Routine:
      case LDataTypeCodes.Task:
        throw new Error(`Unable to directly read type ${LDatatypeNames[tagInfo.type.code].toUpperCase()}: ${tag}`);
      default:
        break;
    }

    values.push(await parseReadTagMemberStructure(layer, tagInfo, data, offset));

    // try {
    //   values.push(await parseReadTagMemberStructure(layer, tagInfo, data, offset));
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


function encodeTagPath(tag) {
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
          offset = Decode(attributeDataType, data, offset, val => tag.type = parseTypeCode(val));
          break;
        default:
          throw new Error(`Unknown attribute: ${attributes[i]}`);
      }
    }

    tags.push(tag);
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
    if (res.code === DataTypes.BOOL) {
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
  } else {
    
  }

  cb(`(${data.toString('ascii', offset)})`);
  return data.length;

  // return offset;
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

  // let extended;
  // if (Buffer.isBuffer(reply.status.additional) && reply.status.additional.length >= 2) {
  //   extended = reply.status.additional.readUInt16LE(0);
  // }

  let error = GenericServiceStatusDescriptions[reply.status.code];
  if (typeof error === 'object') {
    if (Buffer.isBuffer(reply.status.additional) && reply.status.additional.length >= 2) {
      error = error[reply.status.additional.readUInt16LE(0)];
    }
  }
  
  // let extended;
  // if (Buffer.isBuffer(reply.status.additional) && reply.status.additional.length >= 2) {
  //   extended = reply.status.additional.readUInt16LE(0);
  // }

  // let error = GenericServiceStatusDescriptions[reply.status.code];
  // if (typeof error === 'object' && extended != null && error[extended]) {
  //   error = error[extended];
  // }

  reply.status.description = error || 'Unknown Logix5000 error';

  return reply.status.description;
}

// function getError(reply) {
//   if (reply.status.description) {
//     return reply.status.description;
//   }

//   let error;
//   let extended;

//   if (Buffer.isBuffer(reply.status.additional) && reply.status.additional.length >= 2) {
//     extended = reply.status.additional.readUInt16LE(0);
//   }

//   const code = reply.status.code;
//   const service = getBits(reply.service.code, 0, 7);

//   const errorObject = GenericServiceStatusDescriptions[service];

//   console.log({
//     error,
//     extended,
//     code,
//     service,
//     errorObject
//   });

//   if (errorObject) {
//     if (typeof errorObject[code] === 'object') {
//       if (extended != null) {
//         error = errorObject[code][extended];
//       }
//     } else {
//       error = errorObject[code];
//     }
//   }

//   return error || 'Unknown Logix5000 error';
// }


async function getTagInfo(layer, tagInput) {
  const symbolInstanceID = await getTagSymbolInstanceID(layer, tagInput);

  if (symbolInstanceID == null) {
    return null;
  }

  if (symbolInstanceID != null && layer._tags.has(symbolInstanceID)) {
    return layer._tags.get(symbolInstanceID);
  }

  const attributes = [
    SymbolInstanceAttributeCodes.Name,
    SymbolInstanceAttributeCodes.Type
  ];

  for await (const tags of listTags(layer, attributes, null, symbolInstanceID, true)) {
    for (let i = 0; i < tags.length; i++) {
      const tag = tags[i];
      layer._tags.set(tag.id, tag);
    }
    break;
  }

  if (symbolInstanceID != null && layer._tags.has(symbolInstanceID)) {
    return layer._tags.get(symbolInstanceID);
  }
}


async function getTagSymbolInstanceID(layer, tag) {
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

  if (layer._tagNameToSymbolInstanceID.has(tagName)) {
    return layer._tagNameToSymbolInstanceID.get(tagName);
  }

  for await (const tags of listTags(layer, [SymbolInstanceAttributeCodes.Name], null, layer._highestListedSymbolInstanceID + 1, true)) {
    for (let i = 0; i < tags.length; i++) {
      const { name, id } = tags[i];
      // console.log(name, id);
      layer._tagNameToSymbolInstanceID.set(name, id);
      layer._highestListedSymbolInstanceID = id > layer._highestListedSymbolInstanceID ? id : layer._highestListedSymbolInstanceID;
    }

    if (layer._tagNameToSymbolInstanceID.has(tagName)) {
      return layer._tagNameToSymbolInstanceID.get(tagName);
    }
  }
}


async function* listTags(layer, attributes, program, instance, shouldGroup) {
  const scopePath = program ? EPath.EncodeANSIExtSymbol(program) : Buffer.alloc(0);

  let instanceID = instance != null ? instance : 0;
  
  const MIN_TIMEOUT = 700;
  const MAX_TIMEOUT = 5000;
  const MAX_RETRY = 5;

  let timeout = MIN_TIMEOUT;

  const service = SymbolServiceCodes.GetInstanceAttributeList;
  const data = encodeAttributes(attributes);

  let retry = 0;

  while (true) {
    const symbolPath = EPath.Encode(
      ClassCodes.Symbol,
      instanceID
    );

    const path = Buffer.concat([scopePath, symbolPath]);
    
    if (retry <= MAX_RETRY) {
      try {
        if (retry > 0) {
          // console.log(`retrying: ${retry}, ${instanceID}`);
          timeout *= 2;
          timeout = timeout > MAX_TIMEOUT ? MAX_TIMEOUT : timeout;
        }

        const reply = await sendPromise(layer, service, path, data, timeout);

        retry = 0;
        timeout = MIN_TIMEOUT;

        const tags = [];
        const lastInstanceID = parseListTagsResponse(reply, attributes, tags);

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
      } catch (err) {
        retry++;
      }
    } else {
      break;
    }
  }
}