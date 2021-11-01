import CIPRequest from '../request.js';
import EPath from '../epath/index.js';
import { ClassCodes } from '../constants/index.js';
import { ServiceCodes, ServiceNames } from '../../pccc/constants.js';

const PCCCEPath = EPath.Encode(true, [
  new EPath.Segments.Logical.ClassID(ClassCodes.PCCC),
  new EPath.Segments.Logical.InstanceID(0x01),
]);

export const DefaultOptions = {
  vendorID: 0xABCD,
  serialNumber: 0x12345678,
};

export function EncodeExecutePCCCServiceRequest(vendorID, serialNumber, pcccData) {
  const headerLength = 7;
  const buffer = Buffer.allocUnsafe(headerLength + pcccData.length);
  buffer.writeUInt8(headerLength, 0);
  buffer.writeUInt16LE(vendorID, 1);
  buffer.writeUInt32LE(serialNumber, 3);
  pcccData.copy(buffer, 7);
  return buffer;
}

export function CreateExecutePCCCServiceRequest(vendorID, serialNumber, pcccData) {
  const message = EncodeExecutePCCCServiceRequest(vendorID, serialNumber, pcccData);

  return new CIPRequest(
    ServiceCodes.ExecutePCCC,
    PCCCEPath,
    message,
    null,
    { serviceNames: ServiceNames },
  );
}
