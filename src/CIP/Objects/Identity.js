'use strict';

const CIPObject = require('./CIPObject');

// Class Code 0x01
class Identity extends CIPObject {
  GetAttributeSingle() {
    // 0x0E
  }

  Reset() {
    // 0x05
  }

  GetAttributesAll() {
    // 0x01
  }

  SetAttributeSingle() {
    // 0x10
  }
}

module.exports = Identity;

Identity.ClassServices = {
  GetAttributesAll: 0x01,
  Reset: 0x05,
  GetAttributeSingle: 0x0E,
  SetAttributeSingle: 0x10,
  FindNextObjectInstance: 0x11
};
