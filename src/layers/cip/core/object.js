'use strict';

const EPath = require('../epath');
const { CommonServiceCodes } = require('./constants');
const CIPRequest = require('./request');
const CIPAttribute = require('./attribute');
const CIPFeatureGroup = require('./featuregroup');
const { DataType } = require('../datatypes/types');
const { Decode } = require('../datatypes/decoding');


const CommonClassAttribute = Object.freeze({
  Revision: new CIPAttribute.Class(1, 'Revision', DataType.UINT),
  MaxInstance: new CIPAttribute.Class(2, 'Max Instance ID', DataType.UINT),
  NumberOfInstances: new CIPAttribute.Class(3, 'Number Of Instances', DataType.UINT),
  OptionalAttributeList: new CIPAttribute.Class(4, 'Optional Attribute List', DataType.TRANSFORM(
    DataType.STRUCT([
      DataType.UINT,
      DataType.PLACEHOLDER(length => DataType.ABBREV_ARRAY(DataType.UINT, length))
    ], function (members, dt) {
      if (members.length === 1) {
        return dt.resolve(members[0]);
      }
    }),
    value => value[1]
  )),
  OptionalServiceList: new CIPAttribute.Class(4, 'Optional Service List', DataType.TRANSFORM(
    DataType.STRUCT([
      DataType.UINT,
      DataType.PLACEHOLDER(length => DataType.ABBREV_ARRAY(DataType.UINT, length))
    ], function (members, dt) {
      if (members.length === 1) {
        return dt.resolve(members[0]);
      }
    }),
    value => value[1]
  )),
  MaxClassAttribute: new CIPAttribute.Class(6, 'Max Class Attribute ID', DataType.UINT),
  MaxInstanceAttribute: new CIPAttribute.Class(7, 'Max Instance Attribute ID', DataType.UINT),
});

const CommonClassAttributeGroup = new CIPFeatureGroup(Object.values(CommonClassAttribute));


function CIPMetaObject(classCode, options) {
  options = options || {};
  const ClassAttributeGroup = options.ClassAttributeGroup || new CIPFeatureGroup([]);
  const InstanceAttributeGroup = options.InstanceAttributeGroup || new CIPFeatureGroup([]);
  const GetAttributesAllInstanceAttributes = options.GetAttributesAllInstanceAttributes || [];

  class CIPObject {
    static GetInstanceAttributesAll(instanceID) {
      return new CIPRequest(
        CommonServiceCodes.GetAttributesAll,
        EPath.Encode(true, [
          new EPath.Segments.Logical.ClassID(classCode),
          new EPath.Segments.Logical.InstanceID(instanceID)
        ]),
        null,
        (buffer, offset, cb) => {
          const attributeResults = [];
          for (let i = 0; i < GetAttributesAllInstanceAttributes.length; i++) {
            if (offset < buffer.length) {
              offset = this.DecodeInstanceAttribute(
                buffer,
                offset,
                GetAttributesAllInstanceAttributes[i],
                val => attributeResults.push(val)
              );
            } else {
              break;
            }
          }
          if (typeof cb === 'function') {
            cb(attributeResults);
          }
          return offset;
        }
      );
    }

    static GetClassAttribute(attribute) {
      attribute = ClassAttributeGroup.getCode(attribute) || CommonClassAttributeGroup.getCode(attribute);
      return new CIPRequest(
        CommonServiceCodes.GetAttributeSingle,
        EPath.Encode(true, [
          new EPath.Segments.Logical.ClassID(classCode),
          new EPath.Segments.Logical.InstanceID(0),
          new EPath.Segments.Logical.AttributeID(attribute)
        ]),
        null,
        (buffer, offset, cb) => {
          this.DecodeClassAttribute(buffer, offset, attribute, cb);
        }
      );
    }

    static GetInstanceAttribute(instance, attribute) {
      attribute = InstanceAttributeGroup.getCode(attribute);
      return new CIPRequest(
        CommonServiceCodes.GetAttributeSingle,
        EPath.Encode(true, [
          new EPath.Segments.Logical.ClassID(classCode),
          new EPath.Segments.Logical.InstanceID(instance),
          new EPath.Segments.Logical.AttributeID(attribute)
        ]),
        null,
        (buffer, offset, cb) => {
          this.DecodeInstanceAttribute(buffer, offset, attribute, cb);
        }
      );
    }


    static GetAttributeSingle(attribute, instance) {
      if (instance == null) {
        /** class attribute */
        instance = 0;
        attribute = ClassAttributeGroup.getCode(attribute) || CommonClassAttribute.getCode(attribute);
      } else {
        /** instance attribute */
        attribute = InstanceAttributeGroup.getCode(attribute);
      }

      return new CIPRequest(
        CommonServiceCodes.GetAttributeSingle,
        EPath.Encode(true, [
          new EPath.Segments.Logical.ClassID(classCode),
          new EPath.Segments.Logical.InstanceID(instance),
          new EPath.Segments.Logical.AttributeID(attribute)
        ]),
        null,
        (buffer, offset, cb) => {
          this.DecodeInstanceAttribute(buffer, offset, attribute, cb);
        }
      );
    }
    

    // static GetAttributeList(attributes, instance) {
    //   Port.Run(Port.CommonServices)
    // }

    // static Run(service) {

    // }

    static DecodeAttribute(buffer, offset, attribute, cb) {
      if (attribute instanceof CIPAttribute.Class) {
        return this.DecodeClassAttribute(buffer, offset, attribute, cb);
      } else if (attribute instanceof CIPAttribute.Instance) {
        return this.DecodeInstanceAttribute(buffer, offset, attribute, cb);
      } else {
        throw new Error('Unable to determine if attribute is for class or instance');
      }
    }

    static DecodeInstanceAttribute(buffer, offset, attribute, cb) {
      return DecodeAttribute(buffer, offset, InstanceAttributeGroup.get(attribute), cb);
    }

    static DecodeClassAttribute(buffer, offset, attribute, cb) {
      return DecodeAttribute(buffer, offset, ClassAttributeGroup.get(attribute) || CommonClassAttributeGroup.get(attribute), cb);
    }
  }

  CIPObject.CommonClassAttribute = CommonClassAttribute;

  return CIPObject;
}


module.exports = CIPMetaObject;



function DecodeAttribute(buffer, offset, attribute, cb) {
  console.log(attribute);
  const dataType = attribute.dataType;
  if (!dataType) {
    console.log(attribute);
    throw new Error(`Unknown attribute: ${attribute}`);
  }

  let value;
  offset = Decode(dataType, buffer, offset, val => value = val);

  if (typeof cb === 'function') {
    cb({
      attribute: {
        code: attribute.code,
        name: attribute.name
      },
      value
    });
  }
  return offset;
}