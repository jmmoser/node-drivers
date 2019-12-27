'use strict';

class CIPRequest {
  constructor(service, path, data) {
    this.service = service,
    this.path = path;
    this.data = data;
  }
}


module.exports = CIPRequest;