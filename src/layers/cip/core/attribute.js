'use strict';

class CIPAttribute {
  constructor(number, dataType, getable, setable) {
    this.number = number;
    this.dataType = dataType;
    this.getable = getable;
    this.setable = setable;
  }
}

class CIPClassAttribute extends CIPAttribute {

}

class CIPInstanceAttribute extends CIPAttribute {

}

module.exports = CIPAttribute;