import Layer from '../layer';
import ConnectionLayer from './layers/connection';
import { CommonServiceCodes } from '../../core/cip/constants/index';
import EPath from '../../core/cip/epath/index';
import CIPRequest, { CIPResponse } from '../../core/cip/request';

import { CallbackPromise, Callback } from '../../utils';
import { LayerNames } from '../constants';

import * as PCCCHandler from './handlers/pccc';
import CreateCounter, { Counter } from '../../counter';

type CIPLayerOptions = PCCCHandler.PCCCOptions;

export default class CIPLayer extends Layer {
  _options?: CIPLayerOptions;
  _counter: Counter;

  constructor(lowerLayer: Layer, options?: PCCCHandler.PCCCOptions) {
    /** Inject Connection as lower layer */
    super(LayerNames.CIP, new ConnectionLayer(lowerLayer, options));
    this._options = options;
    this._counter = CreateCounter({ maxValue: 0x100000000 });
  }

  sendRequest(connected: boolean, request: CIPRequest, callback?: Callback<CIPResponse>) {
    return CallbackPromise(callback, (resolver) => {
      const context = this.contextCallback((error?: Error, message?: Buffer) => {
        try {
          if (error) {
            resolver.reject(error, message);
          } else if (message) {
            const res = request.response(message, { current: 0 });
            if (res.status.error) {
              resolver.reject(res.status.description || 'Error sending CIP request', res);
            } else {
              resolver.resolve(res);
            }
          }
        } catch (err: any) {
          resolver.reject(err);
        }
      }, this._counter().toString());

      this.send(request.encode(), { connected }, false, context);
    });
  }

  exploreAttributes(classCode: number, instanceID: number, maxAttribute?: number, callback?: Callback<{ code: number; data: Buffer; }[]>) {
    if (typeof maxAttribute === 'function') {
      callback = maxAttribute;
      maxAttribute = undefined;
    }

    if (maxAttribute == null) {
      maxAttribute = 20;
    }

    return CallbackPromise(callback, async (resolver) => {
      const service = CommonServiceCodes.GetAttributeSingle;

      const attributes = [];

      // for (let j = 0; j < 30; j++) {
      for (let i = 1; i < maxAttribute!; i++) {
        attributes.push(i);
      }
      // }

      const attributeValues = await Promise.all(attributes.map(async (attributeID) => {
        const path = EPath.Encode(true, [
          new EPath.Segments.Logical(EPath.Segments.Logical.Types.ClassID, classCode),
          new EPath.Segments.Logical(EPath.Segments.Logical.Types.InstanceID, instanceID),
          new EPath.Segments.Logical(EPath.Segments.Logical.Types.AttributeID, attributeID),
        ]);
        const reply = await this.sendRequest(true, new CIPRequest(service, path));
        return {
          code: attributeID,
          data: reply.data,
        };
      }));

      resolver.resolve(attributeValues);
    });
  }

  sendNextMessage() {
    const request = this.getNextRequest();
    if (request != null) {
      switch (request.layer.name) {
        case LayerNames.PCCC:
          PCCCHandler.Send(this, request, this._options);
          break;
        default:
          break;
      }
      // else {
      //   throw new Error('Currently only supports forwarding PCCC requests');
      // }
    }
  }

  handleData(data: Buffer, info: any, context: any) {
    if (context && context.internal === false) {
      const response = context.request.response(data);
      if (context.type === 'pccc') {
        this.forward(
          response.data.slice(response.data.readUInt8(0)),
          context.info,
          context.context,
        );
        return;
      }
      // throw new Error('Currently only supports forwarding PCCC requests');
    }

    const callback = this.callbackForContext(context);
    if (callback != null) {
      callback(null, data, info);
      return;
    }

    this.forward(data, info, context);
  }
}
