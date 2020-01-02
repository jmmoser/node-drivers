'use strict';

const CIPMetaObject = require('../core/object');
const CIPAttribute = require('../core/attribute');
const CIPFeatureGroup = require('../core/featuregroup');
const CIPRequest = require('../core/request');
const { ClassCodes, CommonServiceCodes } = require('../core/constants');
const EPath = require('../epath');
const { DataType } = require('../datatypes');


const CLASS_CODE = ClassCodes.TCPIPInterface;


const ClassAttribute = Object.freeze({

});


const IPAddressDataType = DataType.TRANSFORM(
  DataType.UDINT,
  function(value) {
    return (
      (value >>> 24) + '.' +
      (value >>> 16 & 255) + '.' +
      (value >>> 8 & 255) + '.' + 
      (value & 255)
    );
  }
)


const InstanceAttribute = Object.freeze({
  Status: new CIPAttribute.Instance(1, 'Status', DataType.TRANSFORM(
    DataType.DWORD,
    function (value) {
      /** TODO: CIP Vol 2, 5-3.2.2.1 */
      return value;
    }
  )),
  ConfigurationCapability: new CIPAttribute.Instance(2, 'Configuration Capability', DataType.TRANSFORM(
    DataType.DWORD,
    function (value) {
      /** TODO: CIP Vol 2, 5-3.2.2.2 */
      return value;
    }
  )),
  ConfigurationControl: new CIPAttribute.Instance(3, 'Configuration Control', DataType.TRANSFORM(
    DataType.DWORD,
    function (value) {
      /** TODO: CIP Vol 2, 5-3.2.2.3 */
      return value;
    }
  )),
  PhysicalLinkObject: new CIPAttribute(4, 'Physical Link Object', DataType.TRANSFORM(
    DataType.STRUCT([
      DataType.UINT,
      DataType.PLACEHOLDER(length => DataType.EPATH(true, length))
    ], function(members, dt) {
      if (members.length === 1) {
        return dt.resolve(2 * members[0]);
      }
    }),
    function(value) {
      return value[1];
    }
  )),
  Configuration: new CIPAttribute.Instance(5, 'Configuration', DataType.STRUCT([
    IPAddressDataType, // IP Address
    IPAddressDataType, // Network Mask
    IPAddressDataType, // Gateway Address
    IPAddressDataType, // Primary Name Server
    IPAddressDataType, // Secondary Name Server
    DataType.STRING // Default Domain Name
  ])),
  HostName: new CIPAttribute.Instance(6, 'Host Name', DataType.STRING)
});


const ClassAttributeGroup = new CIPFeatureGroup(Object.values(ClassAttribute))
const InstanceAttributeGroup = new CIPFeatureGroup(Object.values(InstanceAttribute));


const InstanceGetAttributesAllOrder = Object.freeze([
  InstanceAttribute.Status,
  InstanceAttribute.ConfigurationCapability,
  InstanceAttribute.ConfigurationControl,
  InstanceAttribute.PhysicalLinkObject,
  InstanceAttribute.Configuration,
  InstanceAttribute.HostName
]);


const CIPObject = CIPMetaObject(
  CLASS_CODE,
  ClassAttributeGroup,
  InstanceAttributeGroup,
  null
);


class TCPIPInterface extends CIPObject {
  static GetInstanceAttributesAll(instanceID) {
    return new CIPRequest(
      CommonServiceCodes.GetAttributesAll,
      EPath.Encode(true, [
        new EPath.Segments.Logical.ClassID(CLASS_CODE),
        new EPath.Segments.Logical.InstanceID(instanceID)
      ]),
      null,
      (buffer, offset, cb) => {
        const attributes = [];
        InstanceGetAttributesAllOrder.forEach(attribute => {
          offset = this.DecodeInstanceAttribute(
            buffer,
            offset,
            attribute,
            val => attributes.push(val)
          );
        });
        if (typeof cb === 'function') {
          cb(attributes);
        }
        return offset;
      }
    );
  }
}

TCPIPInterface.InstanceAttribute = InstanceAttribute;
TCPIPInterface.ClassAttribute = ClassAttribute;

module.exports = TCPIPInterface;