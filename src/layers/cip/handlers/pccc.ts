import { DefaultOptions, CreateExecutePCCCServiceRequest } from '../../../core/cip/objects/PCCC';

export type PCCCOptions = {
  vendorID: number;
  serialNumber: number;
};

export function Send(layer: { send: Function }, request: { info?: any; context?: any; message: Buffer }, options?: Options) {
  const opts = {
    ...DefaultOptions,
    ...options,
  };
  const req = CreateExecutePCCCServiceRequest(
    opts.vendorID,
    opts.serialNumber,
    request.message,
  );
  layer.send(req.encode(), { connected: false }, false, {
    type: 'pccc',
    request: req,
    info: request.info,
    context: request.context,
    internal: false,
  });
}
