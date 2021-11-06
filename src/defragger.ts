/* eslint no-underscore-dangle: ["error", { "allowAfterThis": true }] */
import { Ref } from './types.js';

type CompleteHander = (buffer: Buffer, offsetRef: Ref, dataLength: number) => boolean;
type LengthHandler = (buffer: Buffer, offsetRef: Ref) => number;

export default class Defragger {
  _dataLength: number;
  _data: Buffer;
  _completeHandler: CompleteHander;
  _lengthHandler: LengthHandler;
  name?: string;

  constructor(completeHandler: CompleteHander, lengthHandler: LengthHandler, name?: string) {
    this._dataLength = 0;
    this._data = Buffer.allocUnsafe(0);
    this._completeHandler = completeHandler;
    this._lengthHandler = lengthHandler;
    this.name = name;
  }

  append(data: Buffer) {
    this._dataLength += data.length;
    this._data = Buffer.concat([this._data, data], this._dataLength);
  }

  defrag() {
    let defraggedData = null;

    if (
      this._dataLength > 0
      && this._completeHandler(this._data, { current: 0 }, this._dataLength)
    ) {
      const length = this._lengthHandler(this._data, { current: 0 });
      defraggedData = this._data.slice(0, length);
      this._dataLength -= length;
      this._data = this._data.slice(length);
    }

    return defraggedData;
  }
}
