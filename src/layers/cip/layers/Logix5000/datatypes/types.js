import DataTypeCodes from './codes';

const DataType = Object.freeze({
  Program() {
    return { type: DataType.Program, code: DataTypeCodes.Program };
  },
  Map() {
    return { type: DataType.Map, code: DataTypeCodes.Map };
  },
  Routine() {
    return { type: DataType.Routine, code: DataTypeCodes.Routine };
  },
  Task() {
    return { type: DataType.Task, code: DataTypeCodes.Task };
  },
  Cxn() {
    return { type: DataType.Cxn, code: DataTypeCodes.Cxn };
  },
});

export default DataType;
