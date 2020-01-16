'use strict';

const { InvertKeyValues } = require('../../../../utils');

const CIPRequest = require('../../core/request');
const EPath = require('../../core/epath');
const { ClassCodes } = require('../../core/constants');

const ServiceCodes = Object.freeze({
  ExecutePCCC: 0x4B
});

const PCCCServiceNames = InvertKeyValues(ServiceCodes);

const PCCC_EPATH = EPath.Encode(true, [
  new EPath.Segments.Logical.ClassID(ClassCodes.PCCC),
  new EPath.Segments.Logical.InstanceID(0x01)
]);


module.exports = function(options) {
  options = Object.assign({
    vendorID: 0xABCD,
    serialNumber: 0x12345678
  }, options);


  const header = Buffer.allocUnsafe(7);
  header.writeUInt8(7, 0);
  header.writeUInt16LE(options.vendorID, 1);
  header.writeUInt32LE(options.serialNumber, 3);

  return {
    request(data) {
      data = Buffer.concat([header, data]);

      return new CIPRequest(
        ServiceCodes.ExecutePCCC,
        PCCC_EPATH,
        data,
        null,
        {
          serviceNames: PCCCServiceNames
        }
      );
    }
  };
};