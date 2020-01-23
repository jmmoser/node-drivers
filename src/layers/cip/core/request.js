'use strict';

const {
  ClassCodes,
  CommonServiceCodes,
  CommonServiceNames,
  GeneralStatusNames,
  GeneralStatusDescriptions
} = require('./constants');

const EPath = require('./epath');

// const { deferred } = require('../../../utils');

const EncodeSizeSymbol = Symbol('encodeSize');
const RequestMessageSymbol = Symbol('requestMessage');
const ResponseDataHandlerSymbol = Symbol('responseDataHandler');


class CIPRequest {
  constructor(service, path, data, responseHandler, options) {
    this.service = service,
    this.path = path;
    this.data = data;
    
    /** responseHandler can be a function(buffer, offset, cb) or a CIPRequest
     * ConnectionManager's UnconnectedSend specifies the inner request as the handler */
    if (responseHandler instanceof CIPRequest) {
      responseHandler = responseHandler[ResponseDataHandlerSymbol];
    }
    this[ResponseDataHandlerSymbol] = responseHandler;
    this.options = Object.assign({
      acceptedServiceCodes: [service]
    }, options);
  }

  encodeSize() {
    if (this[EncodeSizeSymbol] != null) {
      return this[EncodeSizeSymbol];
    }
    let size = 1;
    if (Buffer.isBuffer(this.path)) {
      size += 1 + this.path.length;
    }
    if (Buffer.isBuffer(this.data)) {
      size += this.data.length;
    }
    this[EncodeSizeSymbol] = size;
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

    this[RequestMessageSymbol] = buffer.slice(startingOffset, offset);

    return offset;
  }

  static Response(buffer, offset = 0, options) {
    return DecodeResponse(buffer, offset, options);
  }

  response(buffer, offset = 0) {
    return DecodeResponse(buffer, offset, this.options, this[RequestMessageSymbol], this[ResponseDataHandlerSymbol]);
  }
}


function DecodeResponse(buffer, offset, options, request, handler) {
  options = options || {};

  const res = {};

  if (request) {
    res.request = request;
  }
  res.buffer = buffer.slice(offset);
  // res.service = buffer.readUInt8(offset); offset += 1;
  const service = buffer.readUInt8(offset) & 0x7F; offset += 1;

  if (options.acceptedServiceCodes && options.acceptedServiceCodes.indexOf(service) < 0) {
    throw new Error(`Invalid service. Expected one of [${options.acceptedServiceCodes.join(',')}], Received ${service}`);
  }

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
  res.status.description = GeneralStatusDescriptions[statusCode] || (res.status.error ? 'CIP Error' : '');

  const extendedStatusSize = buffer.readUInt8(offset); offset += 1; // number of 16 bit words
  res.status.extended = buffer.slice(offset, offset + 2 * extendedStatusSize);
  offset += 2 * extendedStatusSize;

  res.data = buffer.slice(offset);

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


const MessageRouterPath = EPath.Encode(true, [
  new EPath.Segments.Logical.ClassID(ClassCodes.MessageRouter),
  new EPath.Segments.Logical.InstanceID(1)
]);


class CIPMultiServiceRequest extends CIPRequest {
  constructor(requests, path) {
    super(CommonServiceCodes.MultipleServicePacket, path ? path : MessageRouterPath, null, MultiCreateDataHandler(requests));
    this.requests = requests;
  }

  encodeSize() {
    if (this[EncodeSizeSymbol] != null) {
      return this[EncodeSizeSymbol];
    }
    const count = this.requests.length;
    let size = super.encodeSize() + 2 + 2 * count;
    for (let i = 0; i < count; i++) {
      size += this.requests[i].encodeSize();
    }
    this[EncodeSizeSymbol] = size;
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

    this[RequestMessageSymbol] = buffer.slice(startingOffset, offset);

    return offset;
  }
}

function MultiCreateDataHandler(requests) {
  return function (buffer, offset, cb) {
    const numberOfReplies = buffer.readUInt16LE(offset, 0); //offset += 2;

    if (numberOfReplies !== requests.length) {
      throw new Error(`CIP Multiple Service response expected ${requests.length} replies but only received ${numberOfReplies}`);
    }

    const responses = [];

    for (let i = 0; i < numberOfReplies; i++) {
      // console.log(offset, i, buffer.readUInt16LE(offset + 2 + 2 * i), buffer);
      responses.push(requests[i].response(buffer, buffer.readUInt16LE(offset + 2 + 2 * i) + offset));
    }

    cb(responses);

    return offset;
  }
}


CIPRequest.Multi = CIPMultiServiceRequest;

module.exports = CIPRequest;