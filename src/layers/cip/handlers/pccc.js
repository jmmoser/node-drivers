import { DefaultOptions, CreateExecutePCCCServiceRequest } from '../../../core/cip/objects/PCCC.js';

export function Send(layer, request, options) {
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
