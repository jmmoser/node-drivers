import CIPMetaObject from '../../../../../core/cip/object.js';
import CIPAttribute from '../../../../../core/cip/attribute.js';
import { DataType } from '../../../../../core/cip/datatypes/index.js';

const InstanceAttribute = Object.freeze({
  Unknown1: new CIPAttribute.Instance(1, 'Unknown1', DataType.UINT),
  Unknown2: new CIPAttribute.Instance(2, 'Unknown2', DataType.UINT),
  Unknown3: new CIPAttribute.Instance(3, 'Unknown3', DataType.UDINT),
  Unknown4: new CIPAttribute.Instance(4, 'Unknown4', DataType.UDINT),
  Unknown10: new CIPAttribute.Instance(10, 'Unknown10', DataType.UDINT),
});

const CIPObject = CIPMetaObject(0xAC, {
  InstanceAttributes: InstanceAttribute,
});

class Controller extends CIPObject {}

Controller.InstanceAttribute = InstanceAttribute;

export default Controller;
