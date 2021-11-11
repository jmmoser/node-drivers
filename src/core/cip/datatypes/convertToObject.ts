import { DataTypeNames } from './codes';
import { DataType, IDataType } from './types';

export default (dt: object | number | string | Function): IDataType => {
  if (typeof dt === 'object') {
    return dt as IDataType;
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
  return dt as IDataType;
};
