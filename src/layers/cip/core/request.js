'use strict';

const {
  CommonServiceCodes,
  CommonServiceNames,
  GeneralStatusNames,
  GeneralStatusDescriptions
} = require('./constants');


// const INTERNALS = Symbol('REQUEST_INTERNALS');


// class CIPRequest {
//   constructor(service, path, data, responseHandler) {
//     this.service = service,
//     this.path = path;
//     this.data = data;
//     this.handler = responseHandler;

//     this._response = new Promise((resolve, reject) => {
//       this._resolve = resolve;
//       this._reject = reject;
//     });
//   }

//   encodeSize() {
//     if (this._encodeSize != null) {
//       return this._encodeSize;
//     }
//     let size = 1;
//     if (Buffer.isBuffer(this.path)) {
//       size += 1 + this.path.length;
//     }
//     if (Buffer.isBuffer(this.data)) {
//       size += this.data.length;
//     }
//     this._encodeSize = size;
//     return size;
//   }

//   encode() {
//     const buffer = Buffer.alloc(this.encodeSize());
//     this.encodeTo(buffer, 0);
//     return buffer;
//   }

//   encodeTo(buffer, offset = 0) {
//     const startingOffset = offset;

//     offset = buffer.writeUInt8(this.service, offset);

//     if (Buffer.isBuffer(this.path)) {
//       offset = buffer.writeUInt8(this.path.length / 2, offset);
//       const copyLength = this.path.copy(buffer, offset);
//       if (copyLength !== this.path.length) {
//         throw new Error('buffer not large enough');
//       }
//       offset += copyLength;
//     } else {
//       offset = buffer.writeUInt8(0, offset);
//     }

//     if (Buffer.isBuffer(this.data)) {
//       const copyLength = this.data.copy(buffer, offset);
//       if (copyLength !== this.data.length) {
//         throw new Error('buffer not large enough');
//       }
//       offset += copyLength;
//     }

//     this._request = buffer.slice(startingOffset, offset);

//     return offset;
//   }


//   handleData(buffer, offset = 0) {
//     const res = {};
//     res.request = this._request;
//     res.buffer = buffer.slice(offset);
//     // res.service = buffer.readUInt8(offset); offset += 1;
//     const service = buffer.readUInt8(offset) & 0x7F; offset += 1;

//     if (service !== this.service) {
//       throw new Error(`Invalid service. Expected ${this.service}, Received ${service}`);
//     }

//     res.service = {
//       code: service,
//       hex: `0x${service.toString(16)}`,
//       name: CommonServiceNames[service] || 'Unknown'
//     };

//     offset += 1; // reserved

//     const statusCode = buffer.readUInt8(offset); offset += 1;

//     res.status = {};
//     res.status.code = statusCode;
//     res.status.name = GeneralStatusNames[statusCode] || '';
//     res.status.description = GeneralStatusDescriptions[statusCode] || '';
//     res.status.error = statusCode !== 0 && statusCode !== 6;

//     const extendedStatusSize = buffer.readUInt8(offset); offset += 1; // number of 16 bit words
//     res.status.extended = buffer.slice(offset, offset + 2 * extendedStatusSize);
//     offset += 2 * extendedStatusSize;

//     res.data = buffer.slice(offset);

//     if (res.data.length > 0 && typeof this.handler === 'function') {
//       if (this.handler.length === 4) {
//         offset = this.handler(buffer, offset, res, function (val) {
//           res.value = val;
//         });
//       } else {
//         offset = this.handler(buffer, offset, function (val) {
//           res.value = val;
//         });
//       }
//     }

//     this._resolve(res);
    
//     return offset;
//     // return res;
//   }

//   async response() {
//     return this._response;

//     // if (this._response != null) {
//     //   return this._response;
//     // }

//     // this._response = new Promise((resolve, reject) => {
//     //   this._resolve = resolve;
//     //   this._reject = reject;
//     // });
//   }
// }



class CIPRequest {
  constructor(service, path, data, responseHandler, options) {
    this.service = service,
    this.path = path;
    this.data = data;
    this.handler = responseHandler;
    this.options = Object.assign({
      acceptedServiceCodes: [service]
    }, options);
  }

  encodeSize() {
    if (this._encodeSize != null) {
      return this._encodeSize;
    }
    let size = 1;
    if (Buffer.isBuffer(this.path)) {
      size += 1 + this.path.length;
    }
    if (Buffer.isBuffer(this.data)) {
      size += this.data.length;
    }
    this._encodeSize = size;
    return size;
  }

  encode() {
    const buffer = Buffer.alloc(this.encodeSize());
    this.encodeTo(buffer, 0);
    return buffer;
  }

  encodeTo(buffer, offset = 0) {
    const startingOffset = offset;

    offset = buffer.writeUInt8(this.service, offset);

    if (Buffer.isBuffer(this.path)) {
      offset = buffer.writeUInt8(this.path.length / 2, offset);
      const copyLength = this.path.copy(buffer, offset);
      if (copyLength !== this.path.length) {
        throw new Error('buffer not large enough');
      }
      offset += copyLength;
    } else {
      offset = buffer.writeUInt8(0, offset);
    }

    if (Buffer.isBuffer(this.data)) {
      const copyLength = this.data.copy(buffer, offset);
      if (copyLength !== this.data.length) {
        throw new Error('buffer not large enough');
      }
      offset += copyLength;
    }

    this._request = buffer.slice(startingOffset, offset);

    return offset;
  }

  static Response(buffer, offset = 0, options) {
    return DecodeResponse(buffer, offset, options);
  }

  response(buffer, offset = 0) {
    return DecodeResponse(buffer, offset, this.options, this._request, this.handler);
  }
}


module.exports = CIPRequest;


function DecodeResponse(buffer, offset, options, request, handler) {
  options = options || {};

  const res = {};

  if (request) {
    res.request = request;
  }
  res.buffer = buffer.slice(offset);
  // res.service = buffer.readUInt8(offset); offset += 1;
  const service = buffer.readUInt8(offset) & 0x7F; offset += 1;

  res.service = {
    code: service,
    hex: `0x${service.toString(16).padStart(2, '0')}`,
    name: CommonServiceNames[service]
  };

  if (!res.service.name) {
    if (options.serviceNames && options.serviceNames[service]) {
      res.service.name = options.serviceNames[service];
    } else {
      res.service.name = 'Unknown';
    }
  }

  offset += 1; // reserved

  const statusCode = buffer.readUInt8(offset); offset += 1;

  res.status = {};
  res.status.code = statusCode;
  res.status.error = statusCode !== 0 && statusCode !== 6;
  res.status.name = GeneralStatusNames[statusCode] || '';
  res.status.description = GeneralStatusDescriptions[statusCode] || res.status.error ? 'CIP Error' : '';

  const extendedStatusSize = buffer.readUInt8(offset); offset += 1; // number of 16 bit words
  res.status.extended = buffer.slice(offset, offset + 2 * extendedStatusSize);
  offset += 2 * extendedStatusSize;

  res.data = buffer.slice(offset);

  if (options.acceptedServiceCodes && options.acceptedServiceCodes.indexOf(res.service.code) < 0) {
    throw new Error(`Invalid service. Expected ${options.acceptedServiceCodes.join('/')}, Received ${res.service.code}`);
  }

  if (typeof options.statusHandler === 'function') {
    options.statusHandler(statusCode, res.status.extended, function (name, description, type) {
      if (name) {
        res.status.name = name;
      }
      if (description) {
        res.status.description = description;
      }
      if (type) {
        res.status.type = type;
      }
    });
  }

  if (res.data.length > 0) {
    if (res.status.error === false && typeof handler === 'function') {
      if (handler.length === 4) {
        offset = handler(buffer, offset, res, function (val) {
          res.value = val;
        });
      } else {
        offset = handler(buffer, offset, function (val) {
          res.value = val;
        });
      }
    }

    if (res.status.error && typeof options.errorDataHandler === 'function') {
      offset = options.errorDataHandler(buffer, offset, res);
    }
  }

  return res;
}


class CIPMultiServiceRequest extends CIPRequest {
  constructor(path, requests) {
    super(CommonServiceCodes.MultipleServicePacket, path);
    this.requests = requests;
  }

  encodeSize() {
    const count = this.requests.length;
    let size = super.encodeSize() + 2 + 2 * count;
    for (let i = 0; i < count; i++) {
      size += this.requests[i].encodeSize();
    }
    return size;
  }

  encode() {
    const buffer = Buffer.alloc(this.encodeSize());
    this.encodeTo(buffer, 0);
    return buffer;
  }

  encodeTo(buffer, offset) {
    const startingOffset = offset;

    offset = super.encodeTo(buffer, offset);

    offset = buffer.writeUInt16LE(this.requests.length, offset);

    let requestOffset = 2 + 2 * this.requests.length;
    this.requests.forEach(request => {
      offset = buffer.writeUInt16LE(requestOffset, offset);
      requestOffset += request.encodeSize();
    });

    this.requests.forEach(request => {
      offset = request.encodeTo(buffer, offset);
    });

    this._request = buffer.slice(startingOffset, offset);

    return offset;
  }

  response(buffer, offset = 0) {
    const res = super.response(buffer, offset);

    const numberOfReplies = res.data.readUInt16LE(offset, 0);

    if (numberOfReplies !== this.requests.length) {
      throw new Error(`CIP Multiple Service response expected ${this.requests.length} replies but only received ${numberOfReplies}`);
    }

    for (let i = 0; i < numberOfReplies; i++) {
      const request = this.requests[i];
      request.response(res.data, res.data.readUInt16LE(2 + 2 * i));
    }

    return res;
  }
}


CIPRequest.Multi = CIPMultiServiceRequest;