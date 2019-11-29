'use strict';

/**
 * TODO
 * - CIP objects should inherit from this class
 * - handles all common and reserved services and attributes
 */

const EPath = require('./EPath');

const {
  Decode,
  Encode,
  DataTypes,
  CommonServices
} = require('./CIP');


class CIPAttribute {
  constructor(code, dataType, decode, encode) {
    this.code = code;
    this.dataType = dataType;
    this.decode = decode;
    this.encode = encode;

    if (!decode) {
      this.decode = (buffer, offset, callback) => Decode(dataType, buffer, offset, callback);
    }

    if (!encode) {
      this.encode = (value) => Encode(dataType, value);
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
      let numberOfAttributes;
      offset = Decode(DataTypes.UINT, buffer, offset, value => numberOfAttributes = value);

      const attributes = [];

      for (let i = 0; i < numberOfAttributes; i++) {
        offset = Decode(DataTypes.UINT, buffer, offset, value => attributes.push(value));
      }

      callback(attributes);
      return offset;
    },
    (attributes) => {
      const buffers = [];
      buffers.push(Encode(DataTypes.UINT, attributes.length));
      for (let i = 0; i < attributes.length; i++) {
        buffers.push(Encode(DataTypes.UINT, attributes[i]));
      }
      return Buffer.concat(buffers);
    }
  );
  static OptionalServiceList = new CIPClassAttribute(
    5,
    DataTypes.STRUCT,
    (buffer, offset, callback) => {
      let numberOfServices;
      offset = Decode(DataTypes.UINT, buffer, offset, value => numberOfServices = value);

      const services = [];
      for (let i = 0; i < numberOfServices; i++) {
        offset = Decode(DataTypes.UINT, buffer, offset, value => services.push(value));
      }

      callback(services);
      return offset;
    },
    (services) => {
      const buffers = [];
      buffers.push(Encode(DataTypes.UINT, services.length));
      for (let i = 0; i < services.length; i++) {
        buffers.push(Encode(DataTypes.UINT, services[i]));
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
      CommonServices.GetAttributesAll,
      EPath.Encode(this.code, instance)
    );
  }

  /** MessageRouter */
  request(service, path, data) {
    let offset = 0;

    const dataIsBuffer = Buffer.isBuffer(data);
    const dataLength = dataIsBuffer ? data.length : 0;

    const buffer = Buffer.alloc(2 + path.length + dataLength);
    offset = buffer.writeUInt8(service, offset);
    offset = buffer.writeUInt8(path.length / 2, offset);
    offset += path.copy(buffer, offset);

    if (dataIsBuffer) {
      offset += data.copy(buffer, offset);
    }

    return buffer;
  }
}


module.exports = CIPObject;