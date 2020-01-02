'use strict';

const { CommonServiceCodes } = require('./constants');
const Request = require('./request');

class Service extends Request {
  constructor(code, path, data, handler) {
    super(code, path, data);
    this.handler = handler;
  }

  handleData(buffer, offset, )
}

module.exports = Service;


// class GetAttributesAll extends Service


// const CommonServiceHandlers = Object.freeze({
//   [CommonServiceCodes.GetAttributesAll]
// });



function Service(CIPClassObject, code, handler) {
  return {
    Request: function(path, data) {
      return new Request(CIPClassObject, code, path, data, handler);
    }
  }
}

module.exports = Service;