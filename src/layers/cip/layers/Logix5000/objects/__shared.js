'use strict';

const { getBits } = require('../../../../../utils');


class SymbolType {
  constructor(code) {
    this.code = code;
    this.atomic = getBits(code, 15, 16) === 0;
    this.system = getBits(code, 12, 13) > 0;
    this.dimensions = getBits(code, 13, 15);

    let dataType;

    if (this.atomic) {
      const dataTypeCode = getBits(code, 0, 8);
      if (dataTypeCode === DataTypeCodes.BOOL) {
        dataType = DataType.BOOL(getBits(code, 8, 11));
      } else {
        const dataTypeName = DataTypeNames[dataTypeCode] || Logix5000_DatatypeNames[dataTypeCode] || 'Unknown';
        if (dataTypeName) {
          dataType = DataType[dataTypeName] || Logix5000_DataType[dataTypeName];
          if (typeof dataType === 'function') {
            dataType = dataType();
          }
        }
      }
    } else {
      const templateID = getBits(code, 0, 12);
      this.template = {
        id: templateID
      };

      dataType = DataType.ABBREV_STRUCT;
    }
    this.dataType = dataType;
  }
}


module.exports = {
  SymbolType
};