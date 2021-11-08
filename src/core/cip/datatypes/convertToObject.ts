import { DataTypeNames } from './codes';
import { DataType } from './types';

export default (dt: object | number | string | Function) => {
  if (typeof dt === 'object') {
    return dt;
  }
  if (typeof dt === 'number') {
    dt = DataTypeNames[dt];
  }
  if (typeof dt === 'string') {
    dt = (DataType as { [key: string]: any})[dt];
  }
  if (typeof dt === 'function') {
    dt = dt();
  }
  return dt;
};
