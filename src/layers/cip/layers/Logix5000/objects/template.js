import CIPMetaObject from '../../../../../core/cip/object';
import CIPAttribute from '../../../../../core/cip/attribute';
import { DataType } from '../../../../../core/cip/datatypes/index';

const InstanceAttribute = Object.freeze({
  StructureHandle: new CIPAttribute.Instance(1, 'StructureHandle', DataType.UINT), /** Calculated CRC value for members of the structure */
  MemberCount: new CIPAttribute.Instance(2, 'MemberCount', DataType.UINT), /** Number of members defined in the structure */
  DefinitionSize: new CIPAttribute.Instance(4, 'DefinitionSize', DataType.UDINT), /** Size of the template definition structure */
  StructureSize: new CIPAttribute.Instance(5, 'StructureSize', DataType.UDINT), /** Number of bytes transferred on the wire when the structure is read using the Read Tag service */
});

const ClassAttribute = Object.freeze({
  Unknown1: new CIPAttribute.Class(1, 'Unknown1', DataType.UNKNOWN(2)),
  Unknown2: new CIPAttribute.Class(2, 'Unknown2', DataType.UNKNOWN(4)),
  Unknown3: new CIPAttribute.Class(3, 'Unknown3', DataType.UNKNOWN(4)),
  Unknown8: new CIPAttribute.Class(8, 'Unknown8', DataType.UNKNOWN(4)),
});

const CIPObject = CIPMetaObject(0x6C, {
  InstanceAttributes: InstanceAttribute,
  ClassAttributes: ClassAttribute,
});

class Template extends CIPObject { }

Template.InstanceAttribute = InstanceAttribute;
Template.ClassAttribute = ClassAttribute;

export default Template;
