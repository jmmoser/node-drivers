'use strict';

/**
 * TODO
 * - CIP objects should inherit from this class
 * - handles all common and reserved services and attributes
 */

const EPath = require('./EPath');
const { DecodeValue, EncodeValue, DataTypes, Services } = require('./CIP');


class CIPAttribute {
  constructor(code, dataType, decode, encode) {
    this.code = code;
    this.dataType = dataType;
    this.decode = decode;
    this.encode = encode;

    if (!decode) {
      this.decode = (buffer, offset, callback) => DecodeValue(dataType, buffer, offset, callback);
    }

    if (!encode) {
      this.encode = (value) => EncodeValue(dataType, value);
    }
  }
}

class CIPClassAttribute extends CIPAttribute {}



class CIPObjectReservedClassAttributes {
  static Revision = new CIPClassAttribute(1, DataTypes.UINT);
  static MaxInstance = new CIPClassAttribute(2, DataTypes.UINT);
  static NumberOfInstances = new CIPClassAttribute(3, DataTypes.UINT);
  static OptionalAttributeList = new CIPClassAttribute(
    4,
    DataTypes.STRUCT,
    (buffer, offset, callback) => {
      let error;
      let numberOfAttributes;
      offset = DecodeValue(DataTypes.UINT, buffer, offset, (err, value) => {
        error = err;
        numberOfAttributes = value;
      });

      if (error) {
        return callback(error);
      }

      const attributes = [];

      for (let i = 0; i < numberOfAttributes; i++) {
        let attribute;
        offset = DecodeValue(DataTypes.UINT, buffer, offset, (err, value) => {
          error = err;
          attribute = value;
        });

        if (error) {
          return callback(error);
        }

        attributes.push(attribute);
      }

      callback(null, attributes);
      return offset;
    },
    (attributes) => {
      const buffers = [];
      buffers.push(EncodeValue(DataTypes.UINT, attributes.length));
      for (let i = 0; i < attributes.length; i++) {
        buffers.push(EncodeValue(DataTypes.UINT, attributes[i]));
      }
      return Buffer.concat(buffers);
    }
  );
  static OptionalServiceList = new CIPClassAttribute(
    5,
    DataTypes.STRUCT,
    (buffer, offset, callback) => {
      let error;
      let numberOfServices;
      offset = DecodeValue(DataTypes.UINT, buffer, offset, (err, value) => {
        error = err;
        numberOfServices = value;
      });

      if (error) {
        return callback(error);
      }

      const services = [];
      for (let i = 0; i < numberOfServices; i++) {
        let attribute;
        offset = DecodeValue(DataTypes.UINT, buffer, offset, (err, value) => {
          error = err;
          attribute = value;
        });
        if (error) {
          return callback(error);
        }
        services.push(attribute);
      }

      callback(null, services);
      return offset;
    },
    (services) => {
      const buffers = [];
      buffers.push(EncodeValue(DataTypes.UINT, services.length));
      for (let i = 0; i < services.length; i++) {
        buffers.push(EncodeValue(DataTypes.UINT, services[i]));
      }
      return Buffer.concat(buffers);
    }
  );
  static MaximumClassAttributeID = new CIPClassAttribute(6, DataTypes.UINT);
  static MaximumInstanceAttributeID = new CIPClassAttribute(7, DataTypes.UINT);
}



// class CIPServiceRequest {
//   constructor(code, pathFunc, dataFunc, decoder) {
//     this.code = code;
//     this.pathFunc = pathFunc;
//     this.dataFunc = dataFunc;
//     this.decoder = decoder;
//   }

//   encode(classCode, data, ) {

//   }
// }

function CIPServiceRequest(code) {
  return function() {
    
  }
}


class CIPCommonServices {
  static GetAttributesAll = new CIPServiceRequest(
    0x01,
    (instance) => {
      return EPath.Encode(this.code, instance)
    }
  );
}


class CIPObject {
  static ReservedClassAttributes = CIPObjectReservedClassAttributes;

  constructor(code) {
    this.code = code;
  }

  getAttributesAllRequest(instance = 0x01) {
    return this.request(
      Services.GetAttributesAll,
      EPath.Encode(this.code, instance)
    );
  }

  /** MessageRouter */
  request(service, path, data) {
    let offset = 0;

    const dataLength = data != null ? data.length : 0;

    const buffer = Buffer.alloc(2 + path.length + dataLength);
    buffer.writeUInt8(service, offset); offset += 1;
    buffer.writeUInt8(path.length / 2, offset); offset += 1;
    path.copy(buffer, offset); offset += path.length;

    if (Buffer.isBuffer(data)) {
      data.copy(buffer, offset); offset + dataLength;
    }

    return buffer;
  }
}


module.exports = CIPObject;