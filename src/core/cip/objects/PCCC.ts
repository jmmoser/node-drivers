import CIPRequest from '../request';
import EPath from '../epath/index';
import { ClassCodes } from '../constants/index';
import { ServiceCodes, ServiceNames } from '../../pccc/constants';

const PCCCEPath = EPath.Encode(true, [
  new EPath.Segments.Logical(EPath.Segments.Logical.Types.ClassID, ClassCodes.PCCC),
  new EPath.Segments.Logical(EPath.Segments.Logical.Types.InstanceID, 0x01),
]);

export const DefaultOptions = {
  vendorID: 0xABCD,
  serialNumber: 0x12345678,
};

export function EncodeExecutePCCCServiceRequest(vendorID: number, serialNumber: number, pcccData: Buffer) {
  const headerLength = 7;
  const buffer = Buffer.allocUnsafe(headerLength + pcccData.length);
  buffer.writeUInt8(headerLength, 0);
  buffer.writeUInt16LE(vendorID, 1);
  buffer.writeUInt32LE(serialNumber, 3);
  pcccData.copy(buffer, 7);
  return buffer;
}

export function CreateExecutePCCCServiceRequest(vendorID: number, serialNumber: number, pcccData: Buffer) {
  const message = EncodeExecutePCCCServiceRequest(vendorID, serialNumber, pcccData);

  return new CIPRequest(
    ServiceCodes.ExecutePCCC,
    PCCCEPath,
    message,
    undefined,
    { serviceNames: ServiceNames, acceptedServiceCodes: Object.values(ServiceCodes) },
  );
}
