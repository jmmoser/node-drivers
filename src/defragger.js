/* eslint no-underscore-dangle: ["error", { "allowAfterThis": true }] */

export default class Defragger {
  constructor(completeHandler, lengthHandler) {
    this._dataLength = 0;
    this._data = Buffer.allocUnsafe(0);
    this._completeHandler = completeHandler;
    this._lengthHandler = lengthHandler;
  }

  /**
   * Appends data, if given, and returns the next complete frame or null.
   * Call again without data to drain any remaining buffered frames.
   */
  defrag(data) {
    if (data != null && data.length > 0) {
      this._dataLength += data.length;
      this._data = Buffer.concat([this._data, data], this._dataLength);
    }

    if (
      this._dataLength > 0
      && this._completeHandler(this._data, { current: 0 }, this._dataLength)
    ) {
      const length = this._lengthHandler(this._data, { current: 0 });
      const frame = this._data.slice(0, length);
      this._dataLength -= length;
      this._data = this._data.slice(length);
      return frame;
    }

    return null;
  }
}
