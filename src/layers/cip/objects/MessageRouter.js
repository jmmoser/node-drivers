'use strict';

const { InvertKeyValues } = require('../../../utils');

const CIPRequest = require('../core/request');
const { ClassCodes, CommonServiceCodes } = require('../core/constants');

const EPath = require('../epath');

const {
  ClassNames,
  CommonServiceNames,
  GeneralStatusCodeNames,
  GeneralStatusCodeDescriptions
} = require('./CIP');

const {
  Decode,
  DataType
} = require('../datatypes');


const InstanceAttributeCodes = Object.freeze({
  ObjectList: 1,
  MaxSupportedConnections: 2,
  NumberOfActiveConnections: 3,
  ActiveConnections: 4
});

const InstanceAttributeNames = InvertKeyValues(InstanceAttributeCodes);

const InstanceAttributeDataTypes = Object.freeze({
  [InstanceAttributeCodes.ObjectList]: DataType.TRANSFORM(
    DataType.STRUCT([
      DataType.UINT,
      DataType.PLACEHOLDER(length => DataType.ABBREV_ARRAY(DataType.UINT, length))
    ], function(members, placeholder) {
      if (members.length === 1) {
        return placeholder.resolve(members[0]);
      }
    }),
    function (members) {
      const list = members[1];
      return list.sort(function (o1, o2) {
        if (o1 < o2) return -1;
        else if (o1 > o2) return 1;
        return 0;
      }).map(classCode => ({
        code: classCode,
        name: ClassNames[classCode] || 'Unknown'
      }));
    }
  ),
  [InstanceAttributeCodes.MaxSupportedConnections]: DataType.UINT,
  [InstanceAttributeCodes.NumberOfActiveConnections]: DataType.UINT,
  [InstanceAttributeCodes.ActiveConnections]: DataType.ABBREV_ARRAY(DataType.UINT, true)
});


const ClassAttributeCodes = Object.freeze({});
const ClassAttributeNames = InvertKeyValues(ClassAttributeCodes);



class MessageRouter {
  static Request(service, path, data) {
    let offset = 0;

    const dataIsBuffer = Buffer.isBuffer(data)
    const dataLength = dataIsBuffer ? data.length : 0;

    const buffer = Buffer.allocUnsafe(2 + path.length + dataLength);
    offset = buffer.writeUInt8(service, offset);
    offset = buffer.writeUInt8(path.length / 2, offset);
    offset += path.copy(buffer, offset);
    
    if (dataIsBuffer) {
      offset += data.copy(buffer, offset);
    }

    return buffer;
  }


  static Reply(buffer) {
    let offset = 0;
    const res = {};
    res.buffer = buffer;
    // res.service = buffer.readUInt8(offset); offset += 1;
    const service = buffer.readUInt8(offset) & 0x7F; offset += 1;
    
    res.service = {
      code: service,
      hex: `0x${service.toString(16)}`,
      name: CommonServiceNames[service] || 'Unknown'
    };

    offset += 1; // reserved

    const statusCode = buffer.readUInt8(offset); offset += 1;

    res.status = {};
    res.status.code = statusCode;
    res.status.name = GeneralStatusCodeNames[statusCode] || '';
    res.status.description = GeneralStatusCodeDescriptions[statusCode] || '';
    res.status.error = statusCode !== 0 && statusCode !== 6;

    const extendedStatusSize = buffer.readUInt8(offset); offset += 1; // number of 16 bit words
    res.status.extended = buffer.slice(offset, offset + 2 * extendedStatusSize);
    offset += 2 * extendedStatusSize;

    res.data = buffer.slice(offset);
    return res;
  }


  // static DecodeClassAttribute(buffer, offset, attribute, cb) {
  //   const dataType = ClassAttributeDataTypes[attribute];
  //   if (!dataType) {
  //     throw new Error(`Unknown class attribute: ${attribute}`);
  //   }

  //   let value;
  //   offset = Decode(dataType, buffer, offset, val => value = val);

  //   if (typeof cb === 'function') {
  //     cb({
  //       code: attribute,
  //       name: ClassAttributeNames[attribute] || 'Unknown',
  //       value
  //     });
  //   }
  //   return offset;
  // }


  static DecodeInstanceAttribute(data, offset, attribute, cb) {
    const dataType = InstanceAttributeDataTypes[attribute];
    if (!dataType) {
      console.log(attribute);
      throw new Error(`Unknown instance attribute: ${attribute}`);
    }

    let value;
    offset = Decode(dataType, data, offset, val => value = val);

    if (typeof cb === 'function') {
      cb({
        code: attribute,
        name: InstanceAttributeNames[attribute] || 'Unknown',
        value
      });
    }
    return offset;
  }


  static GetInstanceAttribute(instanceID, attribute) {
    return new CIPRequest(
      CommonServiceCodes.GetAttributeSingle,
      EPath.Encode(true, [
        new EPath.Segments.Logical.ClassID(ClassCodes.MessageRouter),
        new EPath.Segments.Logical.InstanceID(instanceID),
        new EPath.Segments.Logical.AttributeID(attribute)
      ]),
      null,
      (buffer, offset, cb) => {
        this.DecodeInstanceAttribute(buffer, offset, attribute, cb);
      }
      // (buffer, offset, cb) => {
      //   this.DecodeInstanceAttribute(buffer, offset, attribute, val => res.value = val);
      // }
    );
  }

  // static GetInstanceAttributesAll(instanceID) {
  //   return new CIPRequest(
  //     CommonServiceCodes.GetAttributesAll,
  //     EPath.Encode(true, [
  //       new EPath.Segments.Logical.ClassID(ClassCodes.MessageRouter),
  //       new EPath.Segments.Logical.InstanceID(instanceID)
  //     ]),
  //     null,
  //     (buffer, offset, cb) => {
  //       this.DecodeInstanceGetAttributesAll(buffer, offset, cb);
  //     }
  //   );
  // }


  // static GetClassAttribute(attribute) {
  //   return new CIPRequest(
  //     CommonServiceCodes.GetAttributeSingle,
  //     EPath.Encode(true, [
  //       new EPath.Segments.Logical.ClassID(ClassCodes.MessageRouter),
  //       new EPath.Segments.Logical.InstanceID(0),
  //       new EPath.Segments.Logical.AttributeID(attribute)
  //     ]),
  //     null,
  //     (buffer, offset, cb) => {
  //       this.DecodeClassAttribute(buffer, offset, attribute, cb);
  //     }
  //   );
  // }








  // static DecodeSupportedObjects(data, offset, cb) {
  //   // const objectCount = data.readUInt16LE(offset); offset += 2;
  //   let objectCount;
  //   offset = Decode(DataType.UINT, data, offset, val => objectCount = val);

  //   const classes = [];
  //   for (let i = 0; i < objectCount; i++) {
  //     offset = Decode(DataType.UINT, data, offset, val => classes.push(val));
  //   }

  //   cb(classes.sort(function (o1, o2) {
  //     if (o1 < o2) return -1;
  //     else if (o1 > o2) return 1;
  //     return 0;
  //   }).map(classCode => ({
  //     code: classCode,
  //     name: ClassNames[classCode] || 'Unknown'
  //   })));

  //   return offset;
  // }

  


  // static DecodeGetInstanceAttributesAll(buffer, offset, cb) {
  //   const info = {};

  //   /** object list may not be supported */
  //   if (offset < length) {
  //     offset = MessageRouter.DecodeSupportedObjects(reply.data, 0, function (classes) {
  //       info.classes = classes;
  //     });
  //   }

  //   /** number active may not be supported */
  //   if (offset < length) {
  //     offset = Decode(DataType.UINT, data, offset, val => info.maximumConnections = val);

  //     let connectionCount;
  //     offset = Decode(DataType.UINT, data, offset, val => connectionCount = val);

  //     const connectionIDs = [];
  //     for (let i = 0; i < connectionCount; i++) {
  //       offset = Decode(DataType.UINT, data, offset, val => connectionIDs.push(val));
  //     }

  //     info.connections = connectionIDs;
  //   }
  // }


  static DecodeGetClassAttributesAll(data, offset, cb) {
    const info = {};
    info.data = data;
    const length = data.length;

    if (offset < length) {
      offset = Decode(DataType.UINT, data, offset, val => info.revision = val);
    }

    if (offset < length) {
      offset = Decode(DataType.UINT, data, offset, val => info.maxInstanceID = val);
    }

    if (offset < length) {
      offset = Decode(DataType.UINT, data, offset, val => info.numberOfInstances = val);
    }

    if (offset < length) {
      let numberOfOptionalAttributes;
      offset = Decode(DataType.UINT, data, offset, val => numberOfOptionalAttributes = val);
      console.log({
        numberOfOptionalAttributes
      });

      info.optionalAttributes = [];
      for (let i = 0; i < numberOfOptionalAttributes; i++) {
        if (offset < length) {
          offset = Decode(DataType.UINT, data, offset, val => info.optionalAttributes.push(val));
        } else {
          console.log('breaking optional attributes');
          break;
        }
      }

      console.log({
        numberOfOptionalAttributes,
        length: info.optionalAttributes.length
      });
    }

    if (offset < length) {
      let numberOfOptionalServices;
      offset = Decode(DataType.UINT, data, offset, val => numberOfOptionalServices = val);

      info.optionalServices = [];
      for (let i = 0; i < numberOfOptionalServices; i++) {
        if (offset < length) {
          offset = Decode(DataType.UINT, data, offset, val => info.optionalServices.push({
            code: val,
            name: CommonServiceNames[val] || 'Unknown',
            hex: `0x${val.toString('16')}`
          }));
        } else {
          console.log('breaking optional services');
          break;
        }
      }

      // console.log({
      //   numberOfOptionalServices,
      //   length: info.optionalServices.length
      // })
    }

    if (offset < length) {
      offset = Decode(DataType.UINT, data, offset, val => info.maxIDNumberOfClassAttributes = val);
    }

    if (offset < length) {
      offset = Decode(DataType.UINT, data, offset, val => info.maxIDNumberOfInstanceAttributes = val);
    }

    info.extra = data.slice(offset);

    cb(info);

    // console.log(data.readUInt16LE(length - 4));
    // console.log(data.readUInt16LE(length - 2));
    // console.log(data.slice(length - 8));

    return offset;
  }
}

MessageRouter.InstanceAttribute = InstanceAttributeCodes;
MessageRouter.ClassAttribute = ClassAttributeCodes;

module.exports = MessageRouter;