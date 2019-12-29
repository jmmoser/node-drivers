'use strict';

class CIPObject {
  constructor(classAttributes, instanceAttributes, statusDescriptions) {
    this.classAttributes = classAttributes;
    this.instanceAttributes = instanceAttributes;
    this.statusDescriptions = statusDescriptions;
  }

  static AttributeName(attribute) {
    // if ()
  }

  static DecodeInstanceAttribute(data, offset, attribute, cb) {
    const dataType = this.instanceAttributes[attribute];
    if (!dataType) {
      console.log(attribute);
      throw new Error(`Unknown instance attribute: ${attribute}`);
    }

    let value;
    offset = Decode(dataType, data, offset, val => value = val);

    if (typeof cb === 'function') {
      cb({
        code: attribute,
        name: InstanceAttributeNames[attribute] || 'Unknown',
        value
      });
    }
    return offset;
  }
}

module.exports = CIPObject;