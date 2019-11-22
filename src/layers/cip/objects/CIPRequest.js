'use strict';


class CIPRequest {
  constructor(service, path, data, handler) {
    this.service = service;
    this.path = path;
    this.data = data;
    this.handler = handler;
  }
}


module.exports = CIPRequest;