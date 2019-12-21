'use strict';

/**
 * TODO
 * - CIP objects should inherit from this class
 * - handles all common and reserved services and attributes
 */

const EPath = require('./EPath');

const {
  // Decode,
  // Encode,
  // DataType,
  CommonServices
} = require('./CIP');


// class CIPAttribute {
//   constructor(code, dataType, decode, encode) {
//     this.code = code;
//     this.dataType = dataType;
//     this.decode = decode;
//     this.encode = encode;

//     if (!decode) {
//       this.decode = (buffer, offset, callback) => Decode(dataType, buffer, offset, callback);
//     }

//     if (!encode) {
//       this.encode = (value) => Encode(dataType, value);
//     }
//   }
// }


// class CIPClassAttribute extends CIPAttribute {}



// class CIPObjectReservedClassAttributes {
//   static Revision = new CIPClassAttribute(1, DataType.UINT);
//   static MaxInstance = new CIPClassAttribute(2, DataType.UINT);
//   static NumberOfInstances = new CIPClassAttribute(3, DataType.UINT);
//   static OptionalAttributeList = new CIPClassAttribute(
//     4,
//     DataType.STRUCT,
//     (buffer, offset, callback) => {
//       let numberOfAttributes;
//       offset = Decode(DataType.UINT, buffer, offset, value => numberOfAttributes = value);

//       const attributes = [];

//       for (let i = 0; i < numberOfAttributes; i++) {
//         offset = Decode(DataType.UINT, buffer, offset, value => attributes.push(value));
//       }

//       callback(attributes);
//       return offset;
//     },
//     (attributes) => {
//       const buffers = [];
//       buffers.push(Encode(DataType.UINT, attributes.length));
//       for (let i = 0; i < attributes.length; i++) {
//         buffers.push(Encode(DataType.UINT, attributes[i]));
//       }
//       return Buffer.concat(buffers);
//     }
//   );
//   static OptionalServiceList = new CIPClassAttribute(
//     5,
//     DataType.STRUCT,
//     (buffer, offset, callback) => {
//       let numberOfServices;
//       offset = Decode(DataType.UINT, buffer, offset, value => numberOfServices = value);

//       const services = [];
//       for (let i = 0; i < numberOfServices; i++) {
//         offset = Decode(DataType.UINT, buffer, offset, value => services.push(value));
//       }

//       callback(services);
//       return offset;
//     },
//     (services) => {
//       const buffers = [];
//       buffers.push(Encode(DataType.UINT, services.length));
//       for (let i = 0; i < services.length; i++) {
//         buffers.push(Encode(DataType.UINT, services[i]));
//       }
//       return Buffer.concat(buffers);
//     }
//   );
//   static MaximumClassAttributeID = new CIPClassAttribute(6, DataType.UINT);
//   static MaximumInstanceAttributeID = new CIPClassAttribute(7, DataType.UINT);
// }



// // class CIPServiceRequest {
// //   constructor(code, pathFunc, dataFunc, decoder) {
// //     this.code = code;
// //     this.pathFunc = pathFunc;
// //     this.dataFunc = dataFunc;
// //     this.decoder = decoder;
// //   }

// //   encode(classCode, data, ) {

// //   }
// // }

// function CIPServiceRequest(code) {
//   return function() {
    
//   }
// }


// class CIPCommonServices {
//   static GetAttributesAll = new CIPServiceRequest(
//     0x01,
//     (instance) => {
//       return EPath.Encode(this.code, instance)
//     }
//   );
// }


class CIPObject {
  // static ReservedClassAttributes = CIPObjectReservedClassAttributes;

  constructor(code, classAttributes, instanceAttributes) {
    this.code = code;
    this.classAttributes = classAttributes;
    this.instanceAttributes = instanceAttributes;
  }

  getAttributesAllRequest(instance = 0x01) {
    return this.request(
      CommonServices.GetAttributesAll,
      EPath.Encode(this.code, instance)
    );
  }

  /** MessageRouter */
  request(service, path, data, route) {
    let offset = 0;
    let totalLength = 1;

    const pathIsBuffer = Buffer.isBuffer(path);
    const dataIsBuffer = Buffer.isBuffer(data);
    const routeIsBuffer = Buffer.isBuffer(route);

    if (pathIsBuffer) {
      totalLength += path.length + 1;
    }
    if (dataIsBuffer) {
      totalLength += data.length;
    }
    if (routeIsBuffer) {
      totalLength += route.length;
    }

    const buffer = Buffer.alloc(totalLength);
    offset = buffer.writeUInt8(service, offset);
    if (pathIsBuffer) {
      offset = buffer.writeUInt8(path.length / 2, offset);
      offset += path.copy(buffer, offset);
    }
    if (dataIsBuffer) {
      offset += data.copy(buffer, offset);
    }
    if (routeIsBuffer) {
      offset += route.copy(buffer, offset);
    }

    return buffer;
  }
}


module.exports = CIPObject;