import CIPMetaObject from '../object';
import CIPAttribute from '../attribute';
import { ClassCodes, } from '../constants/index';
import { DataType, } from '../datatypes/index';
const ClassAttribute = Object.freeze({});
const InstanceAttribute = Object.freeze({
    ObjectList: new CIPAttribute(ClassCodes.MessageRouter, 1, 'Object List', DataType.TRANSFORM(DataType.STRUCT([
        DataType.UINT,
        DataType.PLACEHOLDER((length) => DataType.ABBREV_ARRAY(DataType.UINT, length)),
    ], (members, placeholder) => {
        if (members.length === 1) {
            return placeholder.resolve(members[0]);
        }
        return undefined;
    }), (value) => value[1].sort((o1, o2) => {
        if (o1 < o2)
            return -1;
        if (o1 > o2)
            return 1;
        return 0;
    }).map((classCode) => ({
        code: classCode,
        name: ClassCodes[classCode] || 'Unknown',
    })))),
    MaxSupportedConnections: new CIPAttribute(ClassCodes.MessageRouter, 2, 'Max Supported Connected', DataType.UINT),
    NumberOfActiveConnections: new CIPAttribute(ClassCodes.MessageRouter, 3, 'Number of Active Connections', DataType.UINT),
    ActiveConnections: new CIPAttribute(ClassCodes.MessageRouter, 4, 'Active Connections', DataType.ABBREV_ARRAY(DataType.UINT, true)),
});
const CIPObject = CIPMetaObject(ClassCodes.MessageRouter, {
    ClassAttributes: ClassAttribute,
    InstanceAttributes: InstanceAttribute,
});
export default class MessageRouter extends CIPObject {
}
MessageRouter.ClassAttribute = ClassAttribute;
MessageRouter.InstanceAttribute = InstanceAttribute;
