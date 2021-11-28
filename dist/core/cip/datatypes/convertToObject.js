import { DataTypeCodes } from './codes';
import { DataType } from './types';
export default (dt) => {
    if (typeof dt === 'object') {
        return dt;
    }
    if (typeof dt === 'number') {
        dt = DataTypeCodes[dt];
    }
    if (typeof dt === 'string') {
        dt = DataType[dt];
    }
    if (typeof dt === 'function') {
        dt = dt();
    }
    return dt;
};
