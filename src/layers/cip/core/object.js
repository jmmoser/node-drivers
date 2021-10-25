'use strict';

const EPath = require('./epath');
const { CommonServiceCodes } = require('./constants');
const CIPRequest = require('./request');
const CIPAttribute = require('./attribute');
const CIPFeatureGroup = require('./featuregroup');
const { DataType } = require('./datatypes/types');
const { DecodeTypedData } = require('./datatypes/decoding');

// const CommonClassAttribute = Object.freeze({
//   Revision: new CIPAttribute.Class(1, 'Revision', DataType.UINT),
//   MaxInstance: new CIPAttribute.Class(2, 'Max Instance ID', DataType.UINT),
//   NumberOfInstances: new CIPAttribute.Class(3, 'Number Of Instances', DataType.UINT),
//   OptionalAttributeList: new CIPAttribute.Class(4, 'Optional Attribute List', DataType.TRANSFORM(
//     DataType.STRUCT([
//       DataType.UINT,
//       DataType.PLACEHOLDER(length => DataType.ABBREV_ARRAY(DataType.UINT, length))
//     ], function (members, dt) {
//       if (members.length === 1) {
//         return dt.resolve(members[0]);
//       }
//     }),
//     value => value[1]
//   )),
//   OptionalServiceList: new CIPAttribute.Class(4, 'Optional Service List', DataType.TRANSFORM(
//     DataType.STRUCT([
//       DataType.UINT,
//       DataType.PLACEHOLDER(length => DataType.ABBREV_ARRAY(DataType.UINT, length))
//     ], function (members, dt) {
//       if (members.length === 1) {
//         return dt.resolve(members[0]);
//       }
//     }),
//     value => value[1]
//   )),
//   MaxClassAttribute: new CIPAttribute.Class(6, 'Max Class Attribute ID', DataType.UINT),
//   MaxInstanceAttribute: new CIPAttribute.Class(7, 'Max Instance Attribute ID', DataType.UINT),
// });

// const CommonClassAttributeGroup = new CIPFeatureGroup(Object.values(CommonClassAttribute));

// const CommonServices = Object.freeze({
//   GetAttributeSingle: function(attribute, instance = 0) {
//     let attributeID;
//     if (attribute instanceof CIPAttribute.Class) {
//       attributeID = (
//         ClassAttributeGroup.getCode(attribute) || CommonClassAttributeGroup.getCode(attribute)
//       );
//     } else if (attribute instanceof CIPAttribute.Instance) {
//       attributeID = (
//         InstanceAttributeGroup.getCode(attribute) || CommonClassAttributeGroup.getCode(attribute)
//       );
//     } else {
//       throw new Error(`Attribute must be a CIPClassAttribute or CIPInstanceAttribute`);
//     }
//     return new CIPRequest(
//       CommonServiceCodes.GetAttributeSingle,
//       EPath.Encode(true, [
//         new EPath.Segments.Logical.ClassID(classCode),
//         new EPath.Segments.Logical.InstanceID(instance),
//         new EPath.Segments.Logical.AttributeID(attributeID)
//       ]),
//       null,
//       (buffer, offset, cb) => {
//         return DecodeAttribute(buffer, offset, attribute, cb);
//       }
//     );
//   }
// });

function DecodeAttribute(buffer, offset, attribute, cb) {
  const { dataType } = attribute;
  if (!dataType) {
    console.log(attribute);
    throw new Error(`Unknown attribute: ${attribute}`);
  }

  const offsetRef = { current: offset };
  const value = DecodeTypedData(buffer, offsetRef, dataType);

  if (typeof cb === 'function') {
    cb({
      attribute,
      value,
    });
  }

  return offsetRef.current;
}

function CIPMetaObject(classCode, options) {
  options = options || {};

  const CommonClassAttribute = Object.freeze({
    Revision: new CIPAttribute.Class(1, 'Revision', DataType.UINT),
    MaxInstance: new CIPAttribute.Class(2, 'Max Instance ID', DataType.UINT),
    NumberOfInstances: new CIPAttribute.Class(3, 'Number Of Instances', DataType.UINT),
    OptionalAttributeList: new CIPAttribute.Class(4, 'Optional Attribute List', DataType.TRANSFORM(
      DataType.STRUCT([
        DataType.UINT,
        DataType.PLACEHOLDER((length) => DataType.ABBREV_ARRAY(DataType.UINT, length)),
      ], (members, dt) => {
        if (members.length === 1) {
          return dt.resolve(members[0]);
        }
        return undefined;
      }),
      (value) => value[1],
    )),
    OptionalServiceList: new CIPAttribute.Class(4, 'Optional Service List', DataType.TRANSFORM(
      DataType.STRUCT([
        DataType.UINT,
        DataType.PLACEHOLDER((length) => DataType.ABBREV_ARRAY(DataType.UINT, length)),
      ], (members, dt) => {
        if (members.length === 1) {
          return dt.resolve(members[0]);
        }
        return undefined;
      }),
      (value) => value[1],
    )),
    MaxClassAttribute: new CIPAttribute.Class(6, 'Max Class Attribute ID', DataType.UINT),
    MaxInstanceAttribute: new CIPAttribute.Class(7, 'Max Instance Attribute ID', DataType.UINT),
  });

  const CommonClassAttributes = Object.values(CommonClassAttribute);

  const ClassAttributes = Array.isArray(options.ClassAttributes)
    ? options.ClassAttributes
    : Object.values(options.ClassAttributes || {});

  const InstanceAttributes = Array.isArray(options.InstanceAttributes)
    ? options.InstanceAttributes
    : Object.values(options.InstanceAttributes || {});

  CommonClassAttributes.forEach((attribute) => { attribute.classCode = classCode; });
  ClassAttributes.forEach((attribute) => { attribute.classCode = classCode; });
  InstanceAttributes.forEach((attribute) => { attribute.classCode = classCode; });

  const CommonClassAttributeGroup = new CIPFeatureGroup(CommonClassAttributes);
  const ClassAttributeGroup = new CIPFeatureGroup(ClassAttributes);
  const InstanceAttributeGroup = new CIPFeatureGroup(InstanceAttributes);
  const GetAttributesAllInstanceAttributes = options.GetAttributesAllInstanceAttributes || [];

  class CIPObject {
    static GetInstanceAttributesAll(instanceID) {
      return new CIPRequest(
        CommonServiceCodes.GetAttributesAll,
        EPath.Encode(true, [
          new EPath.Segments.Logical.ClassID(classCode),
          new EPath.Segments.Logical.InstanceID(instanceID),
        ]),
        null,
        (buffer, offset, cb) => this.DecodeInstanceAttributesAll(buffer, offset, cb),
      );
    }

    static GetClassAttribute(attribute) {
      attribute = (
        ClassAttributeGroup.getCode(attribute) || CommonClassAttributeGroup.getCode(attribute)
      );
      return new CIPRequest(
        CommonServiceCodes.GetAttributeSingle,
        EPath.Encode(true, [
          new EPath.Segments.Logical.ClassID(classCode),
          new EPath.Segments.Logical.InstanceID(0),
          new EPath.Segments.Logical.AttributeID(attribute),
        ]),
        null,
        (buffer, offset, cb) => {
          this.DecodeClassAttribute(buffer, offset, attribute, cb);
        },
      );
    }

    static GetInstanceAttribute(instance, attribute) {
      const attributeCode = InstanceAttributeGroup.getCode(attribute);
      if (!attributeCode) {
        throw new Error(`Invalid or unsupported instance attribute: ${attribute}`);
      }

      return new CIPRequest(
        CommonServiceCodes.GetAttributeSingle,
        EPath.Encode(true, [
          new EPath.Segments.Logical.ClassID(classCode),
          new EPath.Segments.Logical.InstanceID(instance),
          new EPath.Segments.Logical.AttributeID(attributeCode),
        ]),
        null,
        (buffer, offset, cb) => {
          this.DecodeInstanceAttribute(buffer, offset, attributeCode, cb);
        },
      );
    }

    static GetAttributeSingle(attribute, instance) {
      let attributeID;
      if (attribute instanceof CIPAttribute.Class) {
        /** class attribute */
        if (instance == null) {
          instance = 0;
        }
        attributeID = (
          ClassAttributeGroup.getCode(attribute) || CommonClassAttribute.getCode(attribute)
        );
      } else {
        /** instance attribute */
        attributeID = InstanceAttributeGroup.getCode(attribute);
      }

      return new CIPRequest(
        CommonServiceCodes.GetAttributeSingle,
        EPath.Encode(true, [
          new EPath.Segments.Logical.ClassID(classCode),
          new EPath.Segments.Logical.InstanceID(instance),
          new EPath.Segments.Logical.AttributeID(attributeID),
        ]),
        null,
        (buffer, offset, cb) => {
          this.DecodeInstanceAttribute(buffer, offset, attribute, cb);
        },
      );
    }

    static DecodeAttribute(buffer, offset, attribute, cb) {
      if (attribute instanceof CIPAttribute.Class) {
        return this.DecodeClassAttribute(buffer, offset, attribute, cb);
      }

      if (attribute instanceof CIPAttribute.Instance) {
        return this.DecodeInstanceAttribute(buffer, offset, attribute, cb);
      }

      throw new Error('Unable to determine if attribute is for class or instance');
    }

    static DecodeInstanceAttributesAll(buffer, offset, cb) {
      const attributeResults = [];
      for (let i = 0; i < GetAttributesAllInstanceAttributes.length; i++) {
        if (offset < buffer.length) {
          offset = this.DecodeInstanceAttribute(
            buffer,
            offset,
            GetAttributesAllInstanceAttributes[i],
            (val) => attributeResults.push(val),
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

    static DecodeInstanceAttribute(buffer, offset, attribute, cb) {
      return DecodeAttribute(buffer, offset, InstanceAttributeGroup.get(attribute), cb);
    }

    static DecodeClassAttribute(buffer, offset, attribute, cb) {
      return DecodeAttribute(
        buffer,
        offset,
        ClassAttributeGroup.get(attribute) || CommonClassAttributeGroup.get(attribute),
        cb,
      );
    }
  }

  CIPObject.CommonClassAttribute = CommonClassAttribute;
  // CIPObject.CommonServices = CommonServices;

  return CIPObject;
}

module.exports = CIPMetaObject;
