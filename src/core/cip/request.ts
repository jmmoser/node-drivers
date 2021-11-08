/* eslint-disable max-classes-per-file */

import {
  ClassCodes,
  CommonServiceCodes,
  CommonServiceNames,
  GeneralStatusNames,
  GeneralStatusCodes,
  GeneralStatusDescriptions,
} from './constants/index';

import EPath from './epath/index';

import { Ref } from '../../types';

const EncodeSizeSymbol = Symbol('encodeSize');
const RequestMessageSymbol = Symbol('requestMessage');
const ResponseDataHandlerSymbol = Symbol('responseDataHandler');

function DecodeResponse(buffer: Buffer, offsetRef: Ref, options, request, handler) {
  const opts = options || {};

  const res = {};

  if (request) {
    res.request = request;
  }
  res.buffer = buffer.slice(offsetRef.current);
  // res.service = buffer.readUInt8(offset); offset += 1;
  const service = buffer.readUInt8(offsetRef.current) & 0x7F; offsetRef.current += 1;

  if (opts.acceptedServiceCodes && opts.acceptedServiceCodes.indexOf(service) < 0) {
    throw new Error(`Invalid service. Expected one of [${opts.acceptedServiceCodes.join(',')}], Received ${service}`);
  }

  res.service = {
    code: service,
    hex: `0x${service.toString(16).padStart(2, '0')}`,
    name: CommonServiceNames[service],
  };

  if (!res.service.name) {
    if (opts.serviceNames && opts.serviceNames[service]) {
      res.service.name = opts.serviceNames[service];
    } else {
      res.service.name = 'Unknown';
    }
  }

  offsetRef.current += 1; // reserved

  const statusCode = buffer.readUInt8(offsetRef.current); offsetRef.current += 1;

  res.status = {};
  res.status.code = statusCode;
  res.status.error = (
    statusCode !== GeneralStatusCodes.Success
    && statusCode !== GeneralStatusCodes.PartialTransfer
  );
  res.status.name = GeneralStatusNames[statusCode] || '';
  res.status.description = GeneralStatusDescriptions[statusCode] || (res.status.error ? 'CIP Error' : '');

  /** Number of 16 bit words */
  const extendedStatusSize = buffer.readUInt8(offsetRef.current); offsetRef.current += 1;
  res.status.extended = buffer.slice(offsetRef.current, offsetRef.current + 2 * extendedStatusSize);
  offsetRef.current += 2 * extendedStatusSize;

  res.data = buffer.slice(offsetRef.current);

  if (typeof opts.statusHandler === 'function') {
    opts.statusHandler(statusCode, res.status.extended, (name, description, type) => {
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
        res.value = handler(buffer, offsetRef, res);
      } else {
        res.value = handler(buffer, offsetRef);
      }
    }

    if (res.status.error && typeof opts.errorDataHandler === 'function') {
      opts.errorDataHandler(buffer, offsetRef, res);
    }
  }

  return res;
}

export default class CIPRequest {
  service: number;
  path: Buffer;
  data: Buffer;
  
  constructor(service: number, path: Buffer, data: Buffer, responseHandler, options) {
    this.service = service;
    this.path = path;
    this.data = data;

    /** responseHandler can be a function(buffer, offsetRef) or a CIPRequest
     * ConnectionManager's UnconnectedSend specifies the inner request as the handler */
    if (responseHandler instanceof CIPRequest) {
      // eslint-disable-next-line no-param-reassign
      responseHandler = responseHandler[ResponseDataHandlerSymbol];
    }

    this[ResponseDataHandlerSymbol] = responseHandler;

    this.options = {
      acceptedServiceCodes: [service],
      ...options,
    };
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

  encodeTo(buffer: Buffer, offset = 0) {
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

  static Response(buffer: Buffer, offsetRef: Ref, options) {
    return DecodeResponse(buffer, offsetRef, options);
  }

  response(buffer: Buffer, offsetRef: Ref) {
    return DecodeResponse(
      buffer,
      offsetRef,
      this.options,
      this[RequestMessageSymbol],
      this[ResponseDataHandlerSymbol],
    );
  }
}

const MessageRouterPath = EPath.Encode(true, [
  new EPath.Segments.Logical.ClassID(ClassCodes.MessageRouter),
  new EPath.Segments.Logical.InstanceID(1),
]);

function MultiCreateDataHandler(requests) {
  return (buffer: Buffer, offsetRef: Ref) => {
    const numberOfReplies = buffer.readUInt16LE(offsetRef.current, 0); // offsetRef.current += 2;

    if (numberOfReplies !== requests.length) {
      throw new Error(`CIP Multiple Service response expected ${requests.length} replies but only received ${numberOfReplies}`);
    }

    const responses = [];

    let lastOffset = offsetRef.current;

    for (let i = 0; i < numberOfReplies; i++) {
      const requestOffsetRef = {
        current: buffer.readUInt16LE(offsetRef.current + 2 + 2 * i) + offsetRef.current,
      };
      responses.push(
        requests[i].response(buffer, requestOffsetRef),
      );
      lastOffset = requestOffsetRef.current;
    }

    offsetRef.current = lastOffset;

    return responses;
  };
}

class CIPMultiServiceRequest extends CIPRequest {
  constructor(requests, path: Buffer) {
    super(
      CommonServiceCodes.MultipleServicePacket,
      path || MessageRouterPath,
      null,
      MultiCreateDataHandler(requests),
    );

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

  encodeTo(buffer: Buffer, offset: number) {
    const startingOffset = offset;

    offset = super.encodeTo(buffer, offset);

    offset = buffer.writeUInt16LE(this.requests.length, offset);

    let requestOffset = 2 + 2 * this.requests.length;
    this.requests.forEach((request) => {
      offset = buffer.writeUInt16LE(requestOffset, offset);
      requestOffset += request.encodeSize();
    });

    this.requests.forEach((request) => {
      offset = request.encodeTo(buffer, offset);
    });

    this[RequestMessageSymbol] = buffer.slice(startingOffset, offset);

    return offset;
  }
}

CIPRequest.Multi = CIPMultiServiceRequest;
