'use strict';

const {
  CommonServiceCodes,
  CommonServiceNames,
  GeneralStatusNames,
  GeneralStatusDescriptions
} = require('./constants');

class CIPRequest {
  constructor(service, path, data, responseHandler) {
    this.service = service,
      this.path = path;
    this.data = data;
    this.handler = responseHandler;
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

  response(buffer, offset = 0) {
    const res = {};
    res.request = this._request;
    res.buffer = buffer.slice(offset);
    // res.service = buffer.readUInt8(offset); offset += 1;
    const service = buffer.readUInt8(offset) & 0x7F; offset += 1;

    if (service !== this.service) {
      throw new Error(`Invalid service. Expected ${this.service}, Received ${service}`);
    }

    res.service = {
      code: service,
      hex: `0x${service.toString(16)}`,
      name: CommonServiceNames[service] || 'Unknown'
    };

    offset += 1; // reserved

    const statusCode = buffer.readUInt8(offset); offset += 1;

    res.status = {};
    res.status.code = statusCode;
    res.status.name = GeneralStatusNames[statusCode] || '';
    res.status.description = GeneralStatusDescriptions[statusCode] || '';
    res.status.error = statusCode !== 0 && statusCode !== 6;

    const extendedStatusSize = buffer.readUInt8(offset); offset += 1; // number of 16 bit words
    res.status.extended = buffer.slice(offset, offset + 2 * extendedStatusSize);
    offset += 2 * extendedStatusSize;

    res.data = buffer.slice(offset);

    if (res.data.length > 0 && typeof this.handler === 'function') {
      if (this.handler.length === 4) {
        offset = this.handler(buffer, offset, res, function (val) {
          res.value = val;
        });
      } else {
        offset = this.handler(buffer, offset, function (val) {
          res.value = val;
        });
      }
    }

    return res;
  }
}


module.exports = CIPRequest;


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