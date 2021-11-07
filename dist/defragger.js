export default class Defragger {
    constructor(lengthHandler, name) {
        this._dataLength = 0;
        this._data = Buffer.allocUnsafe(0);
        // this._completeHandler = completeHandler;
        this._lengthHandler = lengthHandler;
        this.name = name;
    }
    append(data) {
        this._dataLength += data.length;
        this._data = Buffer.concat([this._data, data], this._dataLength);
    }
    defrag() {
        let defraggedData = null;
        const length = this._lengthHandler(this._data, { current: 0 });
        if (
        // this._dataLength > 0
        // && this._completeHandler(this._data, { current: 0 }, this._dataLength)
        length > 0) {
            // const length = this._lengthHandler(this._data, { current: 0 });
            defraggedData = this._data.slice(0, length);
            this._dataLength -= length;
            this._data = this._data.slice(length);
        }
        return defraggedData;
    }
}
