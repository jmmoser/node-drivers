import EPath from './epath/index';
import { CommonServiceCodes } from './constants/index';
import CIPRequest from './request';
import CIPAttribute from './attribute';
import CIPFeatureGroup from './featuregroup';
import { DataType } from './datatypes/types';
import { DecodeTypedData } from './datatypes/decoding';
import { EncodeSize, EncodeTo } from './datatypes/encoding';
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
//       (buffer, offsetRef) => DecodeAttribute(buffer, offsetRef, attribute),
//     );
//   }
// });
function DecodeAttribute(buffer, offsetRef, attribute) {
    const { dataType } = attribute;
    if (!dataType) {
        console.log(attribute);
        throw new Error(`Unknown attribute: ${attribute}`);
    }
    return DecodeTypedData(buffer, offsetRef, dataType);
}
export default function CIPMetaObject(classCode, options) {
    options = options || {};
    const CommonClassAttribute = Object.freeze({
        Revision: new CIPAttribute(classCode, 1, 'Revision', DataType.UINT),
        MaxInstance: new CIPAttribute(classCode, 2, 'Max Instance ID', DataType.UINT),
        NumberOfInstances: new CIPAttribute(classCode, 3, 'Number Of Instances', DataType.UINT),
        OptionalAttributeList: new CIPAttribute(classCode, 4, 'Optional Attribute List', DataType.TRANSFORM(DataType.STRUCT([
            DataType.UINT,
            DataType.PLACEHOLDER((length) => DataType.ABBREV_ARRAY(DataType.UINT, length)),
        ], (members, dt) => {
            if (members.length === 1) {
                return dt.resolve(members[0]);
            }
            return undefined;
        }), (value) => value[1], (attributes) => {
            const buffer = Buffer.alloc(EncodeSize(DataType.UINT) * (1 + attributes.length));
            let offset = 0;
            offset = EncodeTo(buffer, offset, DataType.UINT, attributes.length);
            for (let i = 0; i < attributes.length; i++) {
                offset = EncodeTo(buffer, offset, DataType.UINT, attributes[i]);
            }
            return buffer;
        })),
        OptionalServiceList: new CIPAttribute(classCode, 4, 'Optional Service List', DataType.TRANSFORM(DataType.STRUCT([
            DataType.UINT,
            DataType.PLACEHOLDER((length) => DataType.ABBREV_ARRAY(DataType.UINT, length)),
        ], (members, dt) => {
            if (members.length === 1) {
                return dt.resolve(members[0]);
            }
            return undefined;
        }), (value) => value[1])),
        MaxClassAttribute: new CIPAttribute(classCode, 6, 'Max Class Attribute ID', DataType.UINT),
        MaxInstanceAttribute: new CIPAttribute(classCode, 7, 'Max Instance Attribute ID', DataType.UINT),
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
    const GetAllInstanceAttributes = options.GetAllInstanceAttributes || [];
    class CIPObject {
        static GetInstanceAttributesAll(instanceID) {
            return new CIPRequest(CommonServiceCodes.GetAttributesAll, EPath.Encode(true, [
                new EPath.Segments.Logical(EPath.Segments.Logical.Types.ClassID, classCode),
                new EPath.Segments.Logical(EPath.Segments.Logical.Types.InstanceID, instanceID),
            ]), undefined, (buffer, offsetRef) => this.DecodeInstanceAttributesAll(buffer, offsetRef, instanceID));
        }
        static GetClassAttribute(attribute) {
            const attributeID = (ClassAttributeGroup.getCode(attribute) || CommonClassAttributeGroup.getCode(attribute));
            if (attributeID == null) {
                throw new Error('Invalid attribute');
            }
            return new CIPRequest(CommonServiceCodes.GetAttributeSingle, EPath.Encode(true, [
                new EPath.Segments.Logical(EPath.Segments.Logical.Types.ClassID, classCode),
                new EPath.Segments.Logical(EPath.Segments.Logical.Types.InstanceID, 0),
                new EPath.Segments.Logical(EPath.Segments.Logical.Types.AttributeID, attributeID),
            ]), undefined, (buffer, offsetRef) => this.DecodeClassAttribute(buffer, offsetRef, attribute));
        }
        static GetInstanceAttribute(instanceID, attribute) {
            const attributeObj = InstanceAttributeGroup.get(attribute);
            if (!attributeObj) {
                throw new Error(`Invalid or unsupported instance attribute: ${attribute}`);
            }
            return new CIPRequest(CommonServiceCodes.GetAttributeSingle, EPath.Encode(true, [
                new EPath.Segments.Logical(EPath.Segments.Logical.Types.ClassID, classCode),
                new EPath.Segments.Logical(EPath.Segments.Logical.Types.InstanceID, instanceID),
                new EPath.Segments.Logical(EPath.Segments.Logical.Types.AttributeID, attributeObj.code),
            ]), undefined, (buffer, offsetRef) => this.DecodeAttribute(buffer, offsetRef, attributeObj, instanceID));
        }
        static GetAttributeSingle(instance, attribute) {
            let attributeObj;
            if (instance === 0) {
                /** class attribute */
                attributeObj = (ClassAttributeGroup.get(attribute) || CommonClassAttributeGroup.get(attribute));
            }
            else {
                /** instance attribute */
                attributeObj = InstanceAttributeGroup.get(attribute);
            }
            if (attributeObj == null) {
                throw new Error('Invalid attribute ID');
            }
            return new CIPRequest(CommonServiceCodes.GetAttributeSingle, EPath.Encode(true, [
                new EPath.Segments.Logical(EPath.Segments.Logical.Types.ClassID, classCode),
                new EPath.Segments.Logical(EPath.Segments.Logical.Types.InstanceID, instance),
                new EPath.Segments.Logical(EPath.Segments.Logical.Types.AttributeID, attributeObj.code),
            ]), undefined, (buffer, offsetRef) => this.DecodeAttribute(buffer, offsetRef, attributeObj, instance));
        }
        static DecodeAttribute(buffer, offsetRef, attribute, instanceID) {
            if (instanceID === 0) {
                return this.DecodeClassAttribute(buffer, offsetRef, attribute);
            }
            return this.DecodeAttribute(buffer, offsetRef, attribute, instanceID);
        }
        static DecodeInstanceAttributesAll(buffer, offsetRef, instanceID) {
            const attributeResults = [];
            for (let i = 0; i < GetAllInstanceAttributes.length; i++) {
                if (offsetRef.current < buffer.length) {
                    const attribute = GetAllInstanceAttributes[i];
                    const value = this.DecodeAttribute(buffer, offsetRef, attribute, instanceID);
                    attributeResults.push({
                        value,
                        attribute,
                    });
                }
                else {
                    break;
                }
            }
            return attributeResults;
        }
        static DecodeClassAttribute(buffer, offsetRef, attribute) {
            const attributeObj = ClassAttributeGroup.get(attribute) || CommonClassAttributeGroup.get(attribute);
            if (!attributeObj) {
                throw new Error('Attribute is invalid');
            }
            return DecodeAttribute(buffer, offsetRef, attributeObj);
        }
    }
    CIPObject.CommonClassAttribute = CommonClassAttribute;
    CIPObject.ClassCode = classCode;
    return CIPObject;
}
