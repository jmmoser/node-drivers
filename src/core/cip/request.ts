/* eslint-disable max-classes-per-file */

import {
  ClassCodes,
  CommonServiceCodes,
  GeneralStatusCodes,
  GeneralStatusDescriptions,
} from './constants/index';

import EPath from './epath/index';

import { Ref, CodedValue } from '../../types';

interface CIPStatus extends CodedValue {
  extended: Buffer;
  type?: string;
  error: boolean;
}

export interface CIPResponse {
  request?: Buffer;
  service: CodedValue;
  status: CIPStatus;
  value?: any;
  data: Buffer;
}

export type CIPResponseHandler = CIPRequest | ((buffer: Buffer, offsetRef: Ref, response?: CIPResponse) => any);

type CIPRequestOptions = {
  acceptedServiceCodes?: number[];
  serviceNames?: { [key: number]: string };
  statusHandler?: (statusCode: number, extendedStatus: Buffer) => { name?: string, description?: string, type?: string };
  errorDataHandler?: (buffer: Buffer, offsetRef: Ref, response: any) => void;
};

// const EncodeSizeSymbol = Symbol('encodeSize');
const RequestMessageSymbol = Symbol('requestMessage');
const ResponseDataHandlerSymbol = Symbol('responseDataHandler');

function DecodeResponse(buffer: Buffer, offsetRef: Ref, options: CIPRequestOptions, request?: Buffer, handler?: CIPResponseHandler): CIPResponse {
  const opts = options || {};

  // const res: CIPResponse = {};

  // if (request) {
  //   res.request = request;
  // }

  // res.buffer = buffer.slice(offsetRef.current);
  const startingOffset = offsetRef.current;

  const serviceCode = buffer.readUInt8(offsetRef.current) & 0x7F; offsetRef.current += 1;

  if (opts.acceptedServiceCodes && opts.acceptedServiceCodes.indexOf(serviceCode) < 0) {
    throw new Error(`Invalid service. Expected one of [${opts.acceptedServiceCodes.join(',')}], Received ${serviceCode}`);
  }

  const service = {
    code: serviceCode,
    hex: `0x${serviceCode.toString(16).padStart(2, '0')}`,
    name: CommonServiceCodes[serviceCode],
  };

  if (!service.name) {
    if (opts.serviceNames && opts.serviceNames[serviceCode]) {
      service.name = opts.serviceNames[serviceCode];
    } else {
      service.name = 'Unknown';
    }
  }

  offsetRef.current += 1; // reserved

  const statusCode = buffer.readUInt8(offsetRef.current); offsetRef.current += 1;

  const statusError = (
    statusCode !== GeneralStatusCodes.Success
    && statusCode !== GeneralStatusCodes.PartialTransfer
  );

  /** Number of 16 bit words */
  const extendedStatusSize = buffer.readUInt8(offsetRef.current); offsetRef.current += 1;
  const extendedStatus = buffer.slice(offsetRef.current, offsetRef.current + 2 * extendedStatusSize);
  offsetRef.current += 2 * extendedStatusSize;

  const status: CIPStatus = {
    code: statusCode,
    name: GeneralStatusCodes[statusCode] || '',
    description: GeneralStatusDescriptions[statusCode] || (statusError ? 'CIP Error' : ''),
    error: statusError,
    extended: extendedStatus
  }

  const data = buffer.slice(offsetRef.current);

  if (typeof opts.statusHandler === 'function') {
    const statusHandlerOutput = opts.statusHandler(statusCode, extendedStatus);

    if (statusHandlerOutput.name) {
      status.name = statusHandlerOutput.name;
    }
    if (statusHandlerOutput.description) {
      status.description = statusHandlerOutput.description;
    }
    if (statusHandlerOutput.type) {
      status.type = statusHandlerOutput.type;
    }
  }

  const response: CIPResponse = {
    request,
    service,
    // value,
    data,
    status
  };

  if (buffer.length - offsetRef.current > 0) {
    if (status.error === false && typeof handler === 'function') {
      if (handler.length === 4) {
        response.value = handler(buffer, offsetRef, response);
      } else {
        response.value = handler(buffer, offsetRef);
      }
    }

    if (status.error && typeof opts.errorDataHandler === 'function') {
      opts.errorDataHandler(buffer, offsetRef, response);
    }
  }

  return response;
}

export default class CIPRequest {
  service: number;
  path?: Buffer;
  data?: Buffer;
  options: CIPRequestOptions
  [ResponseDataHandlerSymbol]?: CIPResponseHandler;
  // [EncodeSizeSymbol]?: number;
  [RequestMessageSymbol]?: Buffer;
  
  constructor(service: number, path?: Buffer, data?: Buffer, responseHandler?: CIPResponseHandler, options?: CIPRequestOptions) {
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
    // if (this[EncodeSizeSymbol] != null) {
    //   return this[EncodeSizeSymbol]!;
    // }
    let size = 1;
    if (Buffer.isBuffer(this.path)) {
      size += 1 + this.path.length;
    }
    if (Buffer.isBuffer(this.data)) {
      size += this.data.length;
    }
    // this[EncodeSizeSymbol] = size;
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

  static Response(buffer: Buffer, offsetRef: Ref, options: CIPRequestOptions) {
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
  EPath.Segments.Logical.CreateClassID(ClassCodes.MessageRouter),
  EPath.Segments.Logical.CreateInstanceID(1),
]);

function MultiCreateDataHandler(requests: CIPRequest[]) {
  return (buffer: Buffer, offsetRef: Ref) => {
    const numberOfReplies = buffer.readUInt16LE(offsetRef.current); // offsetRef.current += 2;

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

export class CIPMultiServiceRequest extends CIPRequest {
  requests: CIPRequest[];

  constructor(requests: CIPRequest[], path: Buffer) {
    super(
      CommonServiceCodes.MultipleServicePacket,
      path || MessageRouterPath,
      undefined,
      MultiCreateDataHandler(requests),
    );

    this.requests = requests;
  }

  encodeSize() {
    // if (this[EncodeSizeSymbol] != null) {
    //   return this[EncodeSizeSymbol]!;
    // }
    const count = this.requests.length;
    let size = super.encodeSize() + 2 + 2 * count;
    for (let i = 0; i < count; i++) {
      size += this.requests[i].encodeSize();
    }
    // this[EncodeSizeSymbol] = size;
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