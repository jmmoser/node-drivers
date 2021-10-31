import { DataTypeNames } from './codes.js';
import { DataType } from './types.js';

export default (dt) => {
  if (typeof dt === 'object') {
    return dt;
  }
  if (typeof dt === 'number') {
    dt = DataTypeNames[dt];
  }
  if (typeof dt === 'string') {
    dt = DataType[dt];
  }
  if (typeof dt === 'function') {
    dt = dt();
  }
  return dt;
};
