import { DataTypeCodes } from './codes';
import { DataType, IDataTypeObject } from './types';

export default (dt: object | number | string | Function): IDataTypeObject => {
  if (typeof dt === 'object') {
    return dt as IDataTypeObject;
  }
  if (typeof dt === 'number') {
    dt = DataTypeCodes[dt];
  }
  if (typeof dt === 'string') {
    dt = (DataType as { [key: string]: any})[dt];
  }
  if (typeof dt === 'function') {
    dt = dt();
  }
  return dt as IDataTypeObject;
};
