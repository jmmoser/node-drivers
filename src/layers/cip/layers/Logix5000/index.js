import CIPLayer from '../../ciplayer.js';
import EPath from '../../../../core/cip/epath/index.js';
import CIPRequest from '../../../../core/cip/request.js';
import * as Encoding from './encoding.js';

// const RECORD_TYPES = {
//   CONTROLLER_ATTRIBUTES: 1,
//   TEMPLATE_ATTRIBUTES: 2,
//   TAGNAME_TO_SYMBOLID: 3,
//   TAG: 4
// };

import {
  CommonServiceCodes,
  // ClassCodes,
  GeneralStatusCodes,
} from '../../../../core/cip/constants/index.js';

import {
  DataType,
  DataTypeCodes,
  Encode,
  EncodeSize,
  EncodeTo,
} from '../../../../core/cip/datatypes/index.js';

import { DecodeTypedData } from '../../../../core/cip/datatypes/decoding.js';

import {
  CallbackPromise,
  InfoError,
} from '../../../../utils.js';

import {
  Logix5000DataTypeCodes,
  Logix5000DatatypeNames,
  Logix5000ClassCodes,
  SymbolServiceCodes,
  SymbolServiceNames,
  SymbolInstanceAttributeCodes,
  SymbolInstanceAttributeNames,
  SymbolInstanceAttributeDataTypes,
  TemplateServiceCodes,
  TemplateClassAttributeCodes,
  TemplateClassAttributeDataTypes,
  TemplateInstanceAttributeCodes,
  TemplateInstanceAttributeDataTypes,
  GenericServiceStatusDescriptions,
  Member,
  ControllerInstanceAttributeCodes,
  ControllerInstanceAttributeDataTypes,
  ControllerInstanceAttributeNames,
} from './constants.js';

const DEFAULT_SCOPE = '__DEFAULT_GLOBAL_SCOPE__';

function Logix5000DecodeDataType(buffer, offsetRef, cb) {
  const startingOffset = offsetRef.current;
  const type = EPath.Decode(buffer, offsetRef, null, false, cb);
  /** TODO: Why is this necessary? */
  if (offsetRef.current - startingOffset < 2) {
    offsetRef.current += 1;
  }
  return type;
}

async function parseReadTagMemberStructure(layer, structureType, data, offset) {
  if (!structureType.template) {
    console.log(structureType);
    throw new Error('Tried to read template without id');
  }

  const template = await layer.readTemplate(structureType.template.id);
  if (!template || !Array.isArray(template.members)) {
    return new Error(`Unable to read template: ${structureType.template.id}`);
  }

  const { members } = template;
  const structValues = {};
  for (let i = 0; i < members.length; i++) {
    const member = members[i];
    if (member.type.atomic) {
      const offsetRef = { current: offset + member.offset };

      if (member.type.dimensions === 0) {
        let iDataType;
        if (member.type.dataType.code === DataTypeCodes.BOOL) {
          iDataType = member.type.dataType.type(member.info);
        } else {
          iDataType = member.type.dataType;
        }

        structValues[member.name] = DecodeTypedData(
          data,
          offsetRef,
          iDataType,
        );
        // offset = offsetRef.current;
      } else if (member.type.dimensions === 1) {
        const memberValues = [];
        for (let memberArrIndex = 0; memberArrIndex < member.info; memberArrIndex++) {
          memberValues.push(DecodeTypedData(data, offsetRef, member.type.dataType));
        }
        structValues[member.name] = memberValues;
      } else {
        // TODO
        console.log(member);
        throw new Error('Currently unable to read members with dimensions other than 0 or 1');
      }
    } else {
      structValues[member.name] = await parseReadTagMemberStructure(
        layer,
        member.type,
        data,
        offset + member.offset,
      );
    }
  }
  return structValues;
}

async function parseReadTag(layer, scope, tag, elements, data) {
  if (data.length === 0) {
    return undefined;
  }

  let typeInfo;
  const offset = Logix5000DecodeDataType(data, 0, (val) => { typeInfo = val.value; });

  if (!typeInfo) {
    throw new Error('Unable to decode data type from read tag response data');
  }

  const values = [];
  const offsetRef = { current: offset };

  if (!typeInfo.constructed || typeInfo.abbreviated === false) {
    for (let i = 0; i < elements; i++) {
      values.push(DecodeTypedData(data, offsetRef, typeInfo));
    }
  } else {
    const tagSegments = tag.split('.');

    const tagInfo = await getSymbolInfo(layer, scope, tagSegments[0], [
      SymbolInstanceAttributeCodes.Type,
    ]);

    const tagType = tagInfo[SymbolInstanceAttributeCodes.Type];

    let templateType = tagType;
    for (let i = 1; i < tagSegments.length; i++) {
      const tagSegment = tagSegments[i];
      const template = await layer.readTemplate(templateType.template.id);
      if (!template || !Array.isArray(template.members)) {
        throw new Error(`Unable to read template: ${templateType.template.id}`);
      }
      const { members } = template;
      templateType = null;
      for (let j = 0; j < members.length; j++) {
        const member = members[j];
        if (member.name === tagSegment) {
          templateType = member.type;
          break;
        }
      }
      if (!templateType) {
        break;
      }
    }

    if (!templateType) {
      console.log(tagInfo, scope, tag);
      throw new Error(`Invalid tag: ${tag}`);
    }

    switch (templateType.code) {
      case Logix5000DataTypeCodes.Map:
      case Logix5000DataTypeCodes.Cxn:
      case Logix5000DataTypeCodes.Program:
      case Logix5000DataTypeCodes.Routine:
      case Logix5000DataTypeCodes.Task:
        throw new Error(`Unable to directly read type ${Logix5000DatatypeNames[templateType.code].toUpperCase()}: ${tag}`);
      default:
        break;
    }

    values.push(await parseReadTagMemberStructure(layer, templateType, data, offsetRef.current));
  }

  if (elements === 1) {
    return values[0];
  }

  return values;
}

function statusHandler(code, extended, cb) {
  let error = GenericServiceStatusDescriptions[code];
  if (typeof error === 'object' && Buffer.isBuffer(extended) && extended.length >= 0) {
    error = error[extended.readUInt16LE(0)];
  }
  if (error) {
    cb(null, error);
  }
}

/** Use driver specific error handling if exists */
async function send(self, service, path, data, callback /* , timeout */) {
  try {
    const request = new CIPRequest(service, path, data, null, {
      serviceNames: SymbolServiceNames,
      statusHandler,
    });

    const response = await self.sendRequest(true, request);
    // console.log(response);
    if (response.status.error) {
      callback(response.status.description, response);
    } else {
      callback(null, response);
    }
  } catch (err) {
    console.log(err);
    callback(err.message);
  }
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

async function readTagFragmented(layer, path, elements) {
  const service = SymbolServiceCodes.ReadFragmented;

  const offsetRef = { current: 0 };
  const chunks = [];

  for (; ;) {
    const reqData = Encoding.EncodeReadTagFragmentedServiceData(elements, offsetRef.current);
    const reply = await sendPromise(layer, service, path, reqData, 5000);

    /** remove the tag type bytes if already received */
    Logix5000DecodeDataType(reply.data, offsetRef);
    const dataTypeOffset = offsetRef.current;
    chunks.push(chunks.length > 0 ? reply.data.slice(dataTypeOffset) : reply.data);

    if (reply.status.code === GeneralStatusCodes.PartialTransfer) {
      offsetRef.current = reply.data.length - dataTypeOffset;
    } else if (reply.status.code === 0) {
      break;
    } else {
      throw new InfoError(reply, reply.status.description);
    }
  }

  return Buffer.concat(chunks);
}

function encodeFullSymbolPath(scope, symbol) {
  const symbolPath = Encoding.EncodeSymbolPath(symbol);

  if (scope) {
    return Buffer.concat([
      EPath.Encode(true, EPath.ConvertSymbolToSegments(scope)),
      symbolPath,
    ]);
  }

  return symbolPath;
}

function parseListTagsResponse(reply, attributes, tags, modifier) {
  const { data } = reply;
  const { length } = data;

  const hasModifier = typeof modifier === 'function';

  const offsetRef = { current: 0 };
  let lastInstanceID = 0;

  while (offsetRef.current < length) {
    const tag = {};

    tag.id = DecodeTypedData(data, offsetRef, DataType.UDINT);
    lastInstanceID = tag.id;

    for (let i = 0; i < attributes.length; i++) {
      const attribute = attributes[i];
      const attributeDataType = SymbolInstanceAttributeDataTypes[attribute];
      if (!attributeDataType) {
        throw new Error(`Unknown attribute ${attribute}`);
      }
      tag[attribute] = DecodeTypedData(data, offsetRef, attributeDataType);
    }

    if (hasModifier) {
      tags.push(modifier(tag));
    } else {
      tags.push(tag);
    }
  }

  return lastInstanceID;
}

// function parseTypeCode(code) {
//   const res = {};
//   res.atomic = getBits(code, 15, 16) === 0;
//   res.system = !!getBits(code, 12, 13);
//   res.dimensions = getBits(code, 13, 15);

//   if (res.atomic) {
//     res.code = getBits(code, 0, 8);
//     if (res.code === DataTypeCodes.BOOL) {
//       res.position = getBits(code, 8, 11);
//     }
//     res.name = getDataTypeName(res.code);
//   } else {
//     res.code = DataTypeCodes.ABBREV_STRUCT;
//     const templateID = getBits(code, 0, 12);
//     res.template = {
//       id: templateID
//     };
//     res.name = 'Structure';
//   }

//   return res;
// }

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
  return parseTemplateMemberName(data, offset, (fullname) => {
    const parts = fullname.split(';');
    cb({
      name: parts.length > 0 ? parts[0] : '',
      extra: parts.length > 1 ? parts[1] : '',
    });
  });
}

// function getError(code, extended) {
//   let error = GenericServiceStatusDescriptions[code];
//   if (typeof error === 'object') {
//     if (Buffer.isBuffer(extended) && extended.length >= 2) {
//       return error[extended.readUInt16LE(0)];
//     }
//   }

//   return error;
// }

function scopedGenerator() {
  const separator = '::';
  const args = [...arguments].filter((arg) => !!arg);
  const preface = args.length > 0 ? args.join(separator) + separator : '';
  return () => preface + [...arguments].join(separator);
}

async function getSymbolInstanceID(layer, scope, tag) {
  let tagName;
  switch (typeof tag) {
    case 'string':
      tagName = tag;
      // tagName = tag.split('.')[0];
      break;
    case 'number':
      return tag;
    case 'object':
      return tag.id;
    default:
      throw new Error(`Tag must be a tag name, symbol instance number, or a tag object. Received: ${tag}`);
  }

  const createScopedSymbolName = scopedGenerator(scope);
  const tagNameToSymbolInstanceIDKey = createScopedSymbolName(tagName);

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
      layer._tagNameToSymbolInstanceID.set(createScopedSymbolName(tag[SymbolInstanceAttributeCodes.Name]), tag.id);
      layer._highestListedSymbolInstanceIDs.set(highestListedSymbolInstanceIDScope, tag.id);
    }

    if (layer._tagNameToSymbolInstanceID.has(tagNameToSymbolInstanceIDKey)) {
      return layer._tagNameToSymbolInstanceID.get(tagNameToSymbolInstanceIDKey);
    }
  }

  return undefined;
}

/**
 * Allows getting the type of any tag/member
 * ((scope -> symbol) -> member)
 *
 * User could enter:
 *  - symbol => read the entire symbol
 *  - scope
 *  - scope.symbol
 *  - symbol.member => need the member type
 *  - scope.symbol.member
 *
 * If scope is not specified, scope may be first segment of tag
 */

async function getSymbolInfo(layer, scope, tagInput, attributes) {
  const info = {};

  if (!Array.isArray(attributes)) {
    return info;
  }

  const symbolInstanceID = await getSymbolInstanceID(layer, scope, tagInput);
  if (symbolInstanceID == null) {
    console.log(`Unable to determine symbol instance ID for tag: ${scope ? `${scope}.` : ''}${tagInput}`);
    return info;
  }

  const buildSymbolAttributeKey = scopedGenerator(scope);

  const newAttributes = [];

  attributes.forEach((attribute) => {
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
        newAttributes.forEach((attribute) => {
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

async function* listTags(layer, attributes, scope, instance, shouldGroup, modifier) {
  let instanceID = instance != null ? instance : 0;

  // const MIN_TIMEOUT = 700;
  const MIN_TIMEOUT = 1000;
  const MAX_TIMEOUT = 5000;
  const MAX_RETRY = 5;

  let timeout = MIN_TIMEOUT;

  const service = SymbolServiceCodes.GetInstanceAttributeList;
  const data = Encoding.EncodeAttributes(attributes);

  let retry = 0;

  for (;;) {
    const path = encodeFullSymbolPath(scope, instanceID);

    let reply;

    if (retry <= MAX_RETRY) {
      try {
        reply = await sendPromise(layer, service, path, data, timeout);
      } catch (err) {
        // console.log(instanceID, path, data)
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
        timeout *= 2;
        timeout = timeout > MAX_TIMEOUT ? MAX_TIMEOUT : timeout;
      }
    } else {
      break;
    }
  }
}

async function getSymbolSize(layer, scope, tag) {
  if (typeof tag === 'string' && /\[\d+\]$/.test(tag) === false) {
    try {
      const symbolParts = tag.split('.');
      if (symbolParts.length === 1) {
        const [
          typeInfo,
          arrayDimensionLengthsInfo,
        ] = await layer.readSymbolAttributeList(scope, symbolParts[0], [
          SymbolInstanceAttributeCodes.Type,
          SymbolInstanceAttributeCodes.ArrayDimensionLengths,
        ]);

        // TODO: Update this section when reading multidimensional arrays is figured out
        if (typeInfo.value && typeInfo.value.dimensions > 0) {
          if (
            Array.isArray(arrayDimensionLengthsInfo.value)
            && arrayDimensionLengthsInfo.value.length > 0
          ) {
            let totalLength = 1;
            for (let i = 0; i < arrayDimensionLengthsInfo.value.length; i++) {
              const arrayDimensionLength = arrayDimensionLengthsInfo.value[i];
              if (arrayDimensionLength > 0) {
                totalLength *= arrayDimensionLength;
              }
            }
            return totalLength;
          }
        }
      } else {
        const symbolPartStartIdx = 1;
        const tagInfo = await getSymbolInfo(layer, scope, symbolParts[0], [
          SymbolInstanceAttributeCodes.Type,
        ]);

        const tagType = tagInfo[SymbolInstanceAttributeCodes.Type];

        if (tagType && tagType.dataType.code === Logix5000DataTypeCodes.Program) {
          return getSymbolSize(layer, symbolParts[0], symbolParts.slice(1).join('.'));
        }

        let memberInfo;

        if (tagType && tagType.template && tagType.template.id != null) {
          let template;
          let templateID = tagType.template.id;

          for (let i = symbolPartStartIdx; i < symbolParts.length; i++) {
            let symbolPart = symbolParts[i];
            const symbolPartElementIndex = symbolPart.indexOf('[');
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
            return memberInfo.info;
          }
        }
      }
    } catch (err) {
      // Ignore error
      console.log(err);
    }
  }
  return 1;
}

export default class Logix5000 extends CIPLayer {
  constructor(lowerLayer, options) {
    options = {
      port: 1,
      slot: 0,
      optimize: false,
      ...options,
      networkConnectionParameters: {
        maximumSize: 500,
        ...options?.networkConnectionParameters,
      },
    };

    // options.route = options.route || EPath.Encode(true, [
    //   new EPath.Segments.Port(options.port, options.slot),
    //   new EPath.Segments.Logical.ClassID(ClassCodes.MessageRouter),
    //   new EPath.Segments.Logical.InstanceID(0x01)
    // ]);

    options.route = options.route || [
      new EPath.Segments.Port(options.port, options.slot),
    ];

    super(lowerLayer, options, 'logix5000.cip');

    this.options = options;

    this._highestListedSymbolInstanceIDs = new Map();
    this._tagNameToSymbolInstanceID = new Map();
    this._templateInstanceAttributes = new Map();
    this._templates = new Map();
    this._tags = new Map();

    // this._controllerAttributes = null;

    /** GET PROCESSOR IDENTITY INFO */
    // this.sendRequest(false, )
  }

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

    return CallbackPromise(callback, async (resolver) => {
      if (!tag) {
        resolver.reject('Tag must be specified');
        return;
      }

      if (elements != null) {
        elements = parseInt(elements, 10);
        if (!Number.isFinite(elements) || elements <= 0 || elements > 0xFFFF) {
          resolver.reject('If specified, elements must be a positive integer between 1 and 65535');
          return;
        }
      } else {
        elements = await getSymbolSize(this, null, tag);
      }

      const service = SymbolServiceCodes.Read;
      const path = Encoding.EncodeSymbolPath(tag);
      const requestData = Encode(DataType.UINT, elements);

      send(this, service, path, requestData, async (error, reply) => {
        if (error) {
          console.log(tag);
          resolver.reject(error, reply);
        } else {
          let data;
          try {
            data = reply.status.code !== GeneralStatusCodes.PartialTransfer
              ? reply.data
              : await readTagFragmented(this, path, elements);

            if (data.length === 0) {
              const tagInfo = await getSymbolInfo(this, null, tag, [
                SymbolInstanceAttributeCodes.Type,
              ]);

              const tagType = tagInfo[SymbolInstanceAttributeCodes.Type];

              let value;
              const tagName = typeof tag.name === 'string'
                ? tag.name
                : (typeof tag === 'string' ? tag : null);

              if (tagName && tagType && tagType.dataType.code === Logix5000DataTypeCodes.Program) {
                value = {};

                const listAttributes = [
                  SymbolInstanceAttributeCodes.Name,
                  SymbolInstanceAttributeCodes.Type,
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
    return CallbackPromise(callback, async (resolver) => {
      if (!tag) {
        resolver.reject('tag must be specified');
        return;
      }

      const tagInfo = await getSymbolInfo(this, null, tag, [
        SymbolInstanceAttributeCodes.Type,
      ]);

      if (!tagInfo) {
        resolver.reject(`Invalid tag: ${tag}`);
        return;
      }

      const tagType = tagInfo[SymbolInstanceAttributeCodes.Type];

      if (tagType.atomic !== true) {
        resolver.reject('Writing to structure tags is not currently supported');
        return;
      }

      const service = SymbolServiceCodes.WriteTag;
      const path = Encoding.EncodeSymbolPath(tag);

      const valueDataLength = EncodeSize(tagType.dataType, value);

      const data = Buffer.alloc(4 + valueDataLength);

      data.writeUInt16LE(tagType.dataType.code, 0);
      data.writeUInt16LE(1, 2);
      EncodeTo(data, 4, tagType.dataType, value);

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
    return CallbackPromise(callback, (resolver) => {
      if (tag == null) {
        resolver.reject('tag must be specified');
        return;
      }

      if (
        (!Array.isArray(ORmasks) && !Buffer.isBuffer(ORmasks))
        || (!Array.isArray(ANDmasks) && !Buffer.isBuffer(ANDmasks))
      ) {
        resolver.reject('OR masks and AND masks must be either an array or a buffer');
        return;
      }

      if (ORmasks.length !== ANDmasks.length) {
        resolver.reject('Length of OR masks must be equal to length of AND masks');
        return;
      }

      const sizeOfMasks = ORmasks.length;

      if ((new Set([1, 2, 4, 8, 12])).has(sizeOfMasks) === false) {
        resolver.reject('Size of masks is not valid. Valid lengths are 1, 2, 4, 8, and 12');
        return;
      }

      for (let i = 0; i < sizeOfMasks; i++) {
        if (ORmasks[i] < 0 || ORmasks[i] > 0xFF || ANDmasks[i] < 0 || ANDmasks[i] > 0xFF) {
          resolver.reject('Values in masks must be greater than or equal to zero and less than or equal to 255');
          return;
        }
      }

      const service = SymbolServiceCodes.ReadModifyWriteTag;
      const path = Encoding.EncodeSymbolPath(tag);

      const data = Encoding.EncodeReadModifyWriteMasks(ORmasks, ANDmasks);

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

    return CallbackPromise(callback, async (resolver) => {
      const service = CommonServiceCodes.GetAttributeList;

      const symbolID = await getSymbolInstanceID(this, scope, tag);
      if (symbolID == null) {
        resolver.reject(`Unable to determine symbol instance: ${scope ? `${scope}.` : ''}${tag}`);
        return;
      }

      const path = encodeFullSymbolPath(scope, symbolID);
      const requestData = Encoding.EncodeAttributes(attributes);

      send(this, service, path, requestData, (error, reply) => {
        if (error) {
          resolver.reject(error, reply);
        } else {
          try {
            const { data } = reply;

            const offsetRef = { current: 0 };
            const attributeCount = data.readUInt16LE(offsetRef.current); offsetRef.current += 2;
            const attributeResults = [];

            for (let i = 0; i < attributeCount; i++) {
              const code = data.readUInt16LE(offsetRef.current); offsetRef.current += 2;
              const status = data.readUInt16LE(offsetRef.current); offsetRef.current += 2;

              if (status !== 0) {
                resolver.reject(`Status for attribute ${code} is ${status}`);
                return;
              }

              const type = SymbolInstanceAttributeDataTypes[code];
              if (!type) {
                resolver.reject(`Unknown attribute received: ${code}`);
                return;
              }

              const value = DecodeTypedData(data, offsetRef, type);

              attributeResults.push({
                name: SymbolInstanceAttributeNames[code] || 'Unknown',
                code,
                value,
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

    return CallbackPromise(callback, async (resolver) => {
      const service = CommonServiceCodes.GetAttributesAll;

      const symbolID = await getSymbolInstanceID(this, scope, tag);
      if (symbolID == null) {
        resolver.reject(`Unable to determine symbol instance: ${scope ? `${scope}.` : ''}${tag}`);
        return;
      }

      const path = encodeFullSymbolPath(scope, symbolID);

      send(this, service, path, null, (error, reply) => {
        if (error) {
          resolver.reject(error, reply);
        } else {
          try {
            const { data } = reply;
            const offsetRef = { current: 0 };
            const attributes = [];

            const appendAttribute = (code) => {
              attributes.push({
                name: SymbolInstanceAttributeNames[code] || 'Unknown',
                value: DecodeTypedData(data, offsetRef, SymbolInstanceAttributeDataTypes[code]),
                code,
              });
            };

            /** Attribute 2 */
            // appendAttribute(SymbolInstanceAttributeCodes.Type, code => new SymbolType(code));
            appendAttribute(SymbolInstanceAttributeCodes.Type);

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

            resolver.resolve(attributes.sort((a, b) => {
              if (a.code < b.code) return -1;
              if (a.code > b.code) return 1;
              return 0;
            }));
          } catch (err) {
            resolver.reject(err, reply);
          }
        }
      });
    });
  }

  listTags(scope, callback) {
    const attributes = [
      SymbolInstanceAttributeCodes.Name,
      SymbolInstanceAttributeCodes.Type,
    ];

    function modifier(tagInfo) {
      return {
        name: tagInfo[SymbolInstanceAttributeCodes.Name],
        type: tagInfo[SymbolInstanceAttributeCodes.Type],
      };
    }

    if (arguments.length === 1 && typeof scope === 'function') {
      callback = scope;
      scope = undefined;
    }

    if (typeof callback === 'function') {
      return (async () => {
        for await (const tag of listTags(this, attributes, scope, 0, false, modifier)) {
          if (callback(tag) !== true) {
           return;
          }
        }
        callback(null); /** use null to let caller know we are done */
      })();
    }

    return listTags(this, attributes, scope, 0, false, modifier);
  }

  readTemplate(templateID, callback) {
    return CallbackPromise(callback, async (resolver) => {
      try {
        if (this._templates.has(templateID)) {
          resolver.resolve(this._templates.get(templateID));
          return;
        }

        const service = TemplateServiceCodes.Read;

        const path = EPath.Encode(true, [
          new EPath.Segments.Logical.ClassID(Logix5000ClassCodes.Template),
          new EPath.Segments.Logical.InstanceID(templateID),
        ]);

        let attributes;
        if (this._templateInstanceAttributes.has(templateID)) {
          attributes = this._templateInstanceAttributes.get(templateID);
        } else {
          attributes = await this.readTemplateInstanceAttributes(templateID);
        }

        if (attributes == null) {
          resolver.reject(`Unable to read template attributes for template: ${templateID}`);
          return;
        }

        /** Docs: CIP Logix5000 1756-PM020 */

        /** Documentation says the header is 23 bytes, I'm pretty sure it is only 20 bytes */
        const bytesToRead = attributes[TemplateInstanceAttributeCodes.DefinitionSize] * 4 - 20;
        const chunks = [];

        let reqOffset = 0;

        for (;;) {
          const reqData = Encoding.EncodeReadTemplateServiceData(
            reqOffset,
            bytesToRead - reqOffset,
          );
          const reply = await sendPromise(this, service, path, reqData, 5000);
          chunks.push(reply.data);

          if (reply.status.code === GeneralStatusCodes.PartialTransfer) {
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
            members.push(new Member(type, info, memberOffset));
          }
        }

        let structureName;
        let nameExtra;
        offset = parseTemplateNameInfo(data, offset, (info) => {
          structureName = info.name;
          nameExtra = info.extra;
        });

        /** Read the member names */
        for (let i = 0; i < members.length; i++) {
          const member = members[i];
          offset = parseTemplateMemberName(data, offset, (name) => { member.name = name; });
          if (member.type.dataType.code === DataTypeCodes.SINT && member.name.indexOf('ZZZZZZZZZZ') === 0) {
            /** Member is a host member for holding boolean members */
            member.host = true;
          }
        }

        const template = {
          name: structureName,
          nameExtra,
          members: members.filter((member) => !member.host),
          // members,
          extra: data.slice(offset),
          extraAscii: data.slice(offset).toString('ascii'),
        };

        this._templates.set(templateID, template);

        resolver.resolve(template);
      } catch (err) {
        resolver.reject(err);
      }
    });
  }

  readTemplateClassAttributes(callback) {
    return CallbackPromise(callback, async (resolver) => {
      const service = CommonServiceCodes.GetAttributeList;

      const path = EPath.Encode(true, [
        new EPath.Segments.Logical.ClassID(Logix5000ClassCodes.Template),
        new EPath.Segments.Logical.InstanceID(0),
      ]);

      const reply = await sendPromise(this, service, path, Encoding.EncodeAttributes([
        TemplateClassAttributeCodes.Unknown1,
        TemplateClassAttributeCodes.Unknown2,
        TemplateClassAttributeCodes.Unknown3,
        TemplateClassAttributeCodes.Unknown8,
        /** 9 timed out?? */
      ]));

      const { data } = reply;

      const offsetRef = { current: 0 };
      const attributeCount = data.readUInt16LE(offsetRef.current); offsetRef.current += 2;
      const attributes = {};

      for (let i = 0; i < attributeCount; i++) {
        const attribute = DecodeTypedData(data, offsetRef, DataType.UINT);
        const status = DecodeTypedData(data, offsetRef, DataType.UINT);

        const attributeDataType = TemplateClassAttributeDataTypes[attribute];

        if (attributeDataType == null) {
          throw new Error(`Unknown template attribute received: ${attribute}`);
        }

        if (status === 0) {
          attributes[attribute] = DecodeTypedData(data, offsetRef, attributeDataType);
        } else {
          throw new Error(`Attribute ${attribute} has error status: ${GenericServiceStatusDescriptions[status] || 'Unknown'}`);
        }
      }

      resolver.resolve(attributes);
    });
  }

  readTemplateInstanceAttributes(templateID, callback) {
    return CallbackPromise(callback, (resolver) => {
      try {
        if (this._templateInstanceAttributes.has(templateID)) {
          resolver.resolve(this._templateInstanceAttributes.get(templateID));
          return;
        }

        const service = CommonServiceCodes.GetAttributeList;

        const path = EPath.Encode(true, [
          new EPath.Segments.Logical.ClassID(Logix5000ClassCodes.Template),
          new EPath.Segments.Logical.InstanceID(templateID),
        ]);

        const requestData = Encoding.EncodeAttributes([
          TemplateInstanceAttributeCodes.StructureHandle,
          TemplateInstanceAttributeCodes.MemberCount,
          TemplateInstanceAttributeCodes.DefinitionSize,
          TemplateInstanceAttributeCodes.StructureSize,
        ]);

        send(this, service, path, requestData, (error, reply) => {
          if (error) {
            resolver.reject(error, reply);
          } else {
            try {
              const { data } = reply;

              const offsetRef = { current: 0 };
              const attributeCount = data.readUInt16LE(offsetRef.current); offsetRef.current += 2;
              const attributes = {};

              for (let i = 0; i < attributeCount; i++) {
                const attribute = DecodeTypedData(data, offsetRef, DataType.UINT);
                const status = DecodeTypedData(data, offsetRef, DataType.UINT);

                const attributeDataType = TemplateInstanceAttributeDataTypes[attribute];

                if (attributeDataType == null) {
                  throw new Error(`Unknown template attribute received: ${attribute}`);
                }

                if (status === 0) {
                  attributes[attribute] = DecodeTypedData(data, offsetRef, attributeDataType);
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
    return CallbackPromise(callback, (resolver) => {
      const service = CommonServiceCodes.GetAttributeList;

      const path = EPath.Encode(true, [
        new EPath.Segments.Logical.ClassID(Logix5000ClassCodes.Controller),
        new EPath.Segments.Logical.InstanceID(0x01),
      ]);

      const requestData = Encoding.EncodeAttributes([
        ControllerInstanceAttributeCodes.Unknown1,
        ControllerInstanceAttributeCodes.Unknown2,
        ControllerInstanceAttributeCodes.Unknown3,
        ControllerInstanceAttributeCodes.Unknown4,
        ControllerInstanceAttributeCodes.Unknown10,
      ]);

      send(this, service, path, requestData, (error, reply) => {
        if (error) {
          resolver.reject(error, reply);
        } else {
          try {
            const attributeResponses = [];
            const { data } = reply;
            const offsetRef = { current: 0 };

            const numberOfAttributes = data.readUInt16LE(offsetRef.current); offsetRef.current += 2;

            for (let i = 0; i < numberOfAttributes; i++) {
              const attribute = data.readUInt16LE(offsetRef.current); offsetRef.current += 2;
              const status = data.readUInt16LE(offsetRef.current); offsetRef.current += 2;

              if (status === GeneralStatusCodes.Success) {
                const attributeDataType = ControllerInstanceAttributeDataTypes[attribute];
                if (!attributeDataType) {
                  throw new Error(`Invalid Controller Attribute ${attribute}`);
                }

                const attributeValue = DecodeTypedData(data, offsetRef, attributeDataType);

                attributeResponses.push({
                  code: attribute,
                  name: ControllerInstanceAttributeNames[attribute],
                  value: attributeValue,
                });
              } else {
                throw new Error(`Status ${status} received for controller attribute ${attribute}`);
              }
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
