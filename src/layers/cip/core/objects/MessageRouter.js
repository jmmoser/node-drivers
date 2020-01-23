'use strict';

const CIPMetaObject = require('../object');
const CIPAttribute = require('../attribute');

const {
  ClassCodes,
  ClassNames
} = require('../constants');

const {
  DataType
} = require('../datatypes');


const ClassAttribute = Object.freeze({});

const InstanceAttribute = Object.freeze({
  ObjectList: new CIPAttribute.Instance(1, 'Object List', DataType.TRANSFORM(
    DataType.STRUCT([
      DataType.UINT,
      DataType.PLACEHOLDER(length => DataType.ABBREV_ARRAY(DataType.UINT, length))
    ], function (members, placeholder) {
      if (members.length === 1) {
        return placeholder.resolve(members[0]);
      }
    }),
    function (value) {
      return value[1].sort(function (o1, o2) {
        if (o1 < o2) return -1;
        else if (o1 > o2) return 1;
        return 0;
      }).map(classCode => ({
        code: classCode,
        name: ClassNames[classCode] || 'Unknown'
      }));
    }
  )),
  MaxSupportedConnections: new CIPAttribute.Instance(2, 'Max Supported Connected', DataType.UINT),
  NumberOfActiveConnections: new CIPAttribute.Instance(3, 'Number of Active Connections', DataType.UINT),
  ActiveConnections: new CIPAttribute.Instance(4, 'Active Connections', DataType.ABBREV_ARRAY(DataType.UINT, true))
});


const CIPObject = CIPMetaObject(ClassCodes.MessageRouter, {
  ClassAttributes: ClassAttribute,
  InstanceAttributes: InstanceAttribute
});

class MessageRouter extends CIPObject {}

MessageRouter.ClassAttribute = ClassAttribute;
MessageRouter.InstanceAttribute = InstanceAttribute;

module.exports = MessageRouter;