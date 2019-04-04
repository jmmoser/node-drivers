'use strict';

class Defragger {
  constructor(completeHandler, lengthHandler) {
    this._dataLength = 0;
    this._data = Buffer.alloc(0);
    this._completeHandler = completeHandler;
    this._lengthHandler = lengthHandler;
  }

  defrag(data) {
    let defraggedData = null;

    this._dataLength += data.length;
    this._data = Buffer.concat([this._data, data], this._dataLength);

    while (true) {
      if (this._dataLength > 0 && this._completeHandler(this._data, this._dataLength)) {
        const length = this._lengthHandler(this._data);
        defraggedData = this._data.slice(0, length);
        this._dataLength -= length;
        this._data = this._data.slice(length);
      } else {
        break;
      }
    }

    this._data = Buffer.from(this._data);

    return defraggedData;
  }
}

module.exports = Defragger;
