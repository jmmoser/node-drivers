'use strict';

const {
  getBit,
  getBits,
  CallbackPromise,
  InfoError
} = require('../../../utils');

const EPath = require('../objects/EPath');

const {
  ClassCodes,
  SymbolServiceCodes,
  SymbolServiceNames,
  SymbolServiceErrors,
  SymbolInstanceAttributeCodes,
  SymbolInstanceAttributeDataTypes,
  TemplateServiceCodes,
  TemplateInstanceAttributeCodes,
  TemplateInstanceAttributeDataTypes
} = require('./constants');


class SymbolRequest {
  static Read(tag, elements, callback) {
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
}


module.exports = {
  SymbolRequest
};


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