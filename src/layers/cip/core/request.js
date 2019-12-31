'use strict';

const {
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
    let size = 1;
    if (Buffer.isBuffer(this.path)) {
      size += 1 + this.path.length;
    }
    if (Buffer.isBuffer(this.data)) {
      size += this.data.length;
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