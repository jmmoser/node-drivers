'use strict';

const EPath = require('../../core/epath');
const CIPRequest = require('../../core/request');
const { CommonServiceCodes } = require('../../core/constants');

const { CallbackPromise } = require('../../../../utils');
const Layer = require('../../../Layer');
const ConnectionLayer = require('./CIPConnectionLayer');

// const { OBJECTS } = require('../../core/objects');

const PCCC = require('./pccc');

class CIPInternalLayer extends Layer {
  constructor(lowerLayer, options, name) {
    /** Inject Connection as lower layer */
    super(name || 'cip', new ConnectionLayer(lowerLayer, options));
    this._options = options;
  }

  layerAdded(layer) {
    switch (layer.name) {
      case 'pccc':
        this._pccc = PCCC(this._options);
        break;
      default:
        throw new Error('CIP layer currently only supports forwarding PCCC layer');
    }
  }

  sendRequest(connected, request, callback) {
    return CallbackPromise(callback, (resolver) => {
      const timeout = null;

      const context = this.contextCallback((error, message) => {
        try {
          if (error) {
            resolver.reject(error, message);
          } else {
            const res = request.response(message, 0);
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

      for (let i = 1; i < maxAttribute; i++) {
        try {
          const path = EPath.Encode(true, [
            new EPath.Segments.Logical.ClassID(classCode),
            new EPath.Segments.Logical.InstanceID(instanceID),
            new EPath.Segments.Logical.AttributeID(i),
          ]);
          const reply = await this.sendRequest(true, new CIPRequest(service, path));
          attributes.push({
            code: i,
            data: reply.data,
          });
        } catch (err) {
          if (!err.info || !err.info.status || err.info.status.code !== 20) {
            resolver.reject(err);
            return;
          }
        }
      }

      resolver.resolve(attributes);
    });
  }

  sendNextMessage() {
    const request = this.getNextRequest();
    if (request != null) {
      if (request.layer.name === 'pccc') {
        const req = this._pccc.request(request.message);
        this.send(req.encode(), { connected: false }, false, {
          type: 'pccc',
          request: req,
          info: request.info,
          context: request.context,
          internal: false,
        });
      }
      // else {
      //   throw new Error('Currently only supports forwarding PCCC requests');
      // }

      setImmediate(() => this.sendNextMessage());
    }
  }

  handleData(data, info, context) {
    if (context && context.internal === false) {
      const response = context.request.response(data);
      // console.log(response);
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

module.exports = CIPInternalLayer;
