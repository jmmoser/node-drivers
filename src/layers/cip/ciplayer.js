import Layer from '../layer.js';
import ConnectionLayer from './layers/connection.js';
import { CommonServiceCodes } from '../../core/cip/constants/index.js';
import EPath from '../../core/cip/epath/index.js';
import CIPRequest from '../../core/cip/request.js';

import { CallbackPromise } from '../../utils.js';
import { LayerNames } from '../constants.js';

import * as PCCCHandler from './handlers/pccc.js';

export default class CIPLayer extends Layer {
  constructor(lowerLayer, options) {
    /** Inject Connection as lower layer */
    super(LayerNames.CIP, new ConnectionLayer(lowerLayer, options));
    this._options = options;
  }

  sendRequest(connected, request, callback) {
    return CallbackPromise(callback, (resolver) => {
      const timeout = null;

      const context = this.contextCallback((error, message) => {
        try {
          if (error) {
            resolver.reject(error, message);
          } else {
            const res = request.response(message, { current: 0 });
            if (res.status.error) {
              resolver.reject(res.status.description, res);
            } else {
              resolver.resolve(res);
            }
          }
        } catch (err) {
          resolver.reject(err);
        }
      }, null, timeout);

      this.send(request.encode(), { connected }, false, context);
    });
  }

  exploreAttributes(classCode, instanceID, maxAttribute, callback) {
    if (typeof maxAttribute === 'function') {
      callback = maxAttribute;
      maxAttribute = null;
    }

    if (maxAttribute == null) {
      maxAttribute = 20;
    }

    return CallbackPromise(callback, async (resolver) => {
      const service = CommonServiceCodes.GetAttributeSingle;

      const attributes = [];

      // for (let j = 0; j < 30; j++) {
      for (let i = 1; i < maxAttribute; i++) {
        attributes.push(i);
      }
      // }

      const attributeValues = await Promise.all(attributes.map(async (attribute) => {
        const path = EPath.Encode(true, [
          new EPath.Segments.Logical.ClassID(classCode),
          new EPath.Segments.Logical.InstanceID(instanceID),
          new EPath.Segments.Logical.AttributeID(attribute),
        ]);
        const reply = await this.sendRequest(true, new CIPRequest(service, path));
        return {
          code: attribute,
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

  handleData(data, info, context) {
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
