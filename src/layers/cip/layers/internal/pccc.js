import { InvertKeyValues } from '../../../../utils.js';

import CIPRequest from '../../core/request.js';
import EPath from '../../core/epath/index.js';
import { ClassCodes } from '../../core/constants/index.js';

const ServiceCodes = Object.freeze({
  ExecutePCCC: 0x4B,
});

const PCCCServiceNames = InvertKeyValues(ServiceCodes);

const PCCC_EPATH = EPath.Encode(true, [
  new EPath.Segments.Logical.ClassID(ClassCodes.PCCC),
  new EPath.Segments.Logical.InstanceID(0x01),
]);

export default (options) => {
  const opts = {
    vendorID: 0xABCD,
    serialNumber: 0x12345678,
    ...options,
  };

  const header = Buffer.allocUnsafe(7);
  header.writeUInt8(7, 0);
  header.writeUInt16LE(opts.vendorID, 1);
  header.writeUInt32LE(opts.serialNumber, 3);

  return {
    request(data) {
      return new CIPRequest(
        ServiceCodes.ExecutePCCC,
        PCCC_EPATH,
        Buffer.concat([header, data]),
        null,
        { serviceNames: PCCCServiceNames },
      );
    },
  };
};
