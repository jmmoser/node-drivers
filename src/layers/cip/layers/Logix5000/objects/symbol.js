import CIPMetaObject from '../../../../../core/cip/object.js';
import CIPAttribute from '../../../../../core/cip/attribute.js';
import { DataType } from '../../../../../core/cip/datatypes/index.js';
import { SymbolType } from './__shared.js';

const InstanceAttribute = Object.freeze({
  Name: new CIPAttribute.Instance(1, 'Name', DataType.STRING),
  Type: new CIPAttribute.Instance(2, 'Type', DataType.TRANSFORM(DataType.UINT, (val) => new SymbolType(val))),
  Bytes: new CIPAttribute.Instance(7, 'Bytes', DataType.UINT),
  ArrayDimensionLengths: new CIPAttribute.Instance(8, 'ArrayDimensionLengths', DataType.ARRAY(DataType.UDINT, 0, 2)),
  Unknown3: new CIPAttribute.Instance(3, 'Unknown3', DataType.UNKNOWN(4)),
  Unknown5: new CIPAttribute.Instance(5, 'Unknown5', DataType.UNKNOWN(4)),
  Unknown6: new CIPAttribute.Instance(6, 'Unknown6', DataType.UNKNOWN(4)),
  Unknown9: new CIPAttribute.Instance(9, 'Unknown9', DataType.UNKNOWN(1)),
  Unknown10: new CIPAttribute.Instance(10, 'Unknown10', DataType.UNKNOWN(1)),
  Unknown11: new CIPAttribute.Instance(11, 'Unknown11', DataType.UNKNOWN(1)),
});

const CIPObject = CIPMetaObject(0x6B, {
  InstanceAttributes: InstanceAttribute,
});

class SymbolObject extends CIPObject { }

SymbolObject.InstanceAttribute = InstanceAttribute;

export default SymbolObject;
