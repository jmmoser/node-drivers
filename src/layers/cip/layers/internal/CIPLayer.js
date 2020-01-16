'use strict';

const CIPRequest = require('../../core/request');
const { CommonServiceCodes } = require('../../core/constants');
const { CallbackPromise } = require('../../../../utils');
const EPath = require('../../core/epath');
const Layer = require('../../../Layer');
const ConnectionLayer = require('./CIPInternalLayer');


const PCCC = require('./pccc');


class CIPLayer extends Layer {
  constructor(lowerLayer, options, name) {
    /** Inject Connection as lower layer */
    lowerLayer = new ConnectionLayer(lowerLayer, options);
    super(name || 'cip', lowerLayer);
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
    return CallbackPromise(callback, resolver => {
      CIPLayer.Send(this, connected, request, function (error, reply) {
        if (error) {
          resolver.reject(error, reply);
        } else {
          resolver.resolve(reply);
        }
      });
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

    return CallbackPromise(callback, async resolver => {
      const service = CommonServiceCodes.GetAttributeSingle;

      const attributes = [];

      for (let i = 1; i < maxAttribute; i++) {
        try {
          const path = EPath.Encode(true, [
            new EPath.Segments.Logical.ClassID(classCode),
            new EPath.Segments.Logical.InstanceID(instanceID),
            new EPath.Segments.Logical.AttributeID(i)
          ]);
          const reply = await this.sendRequest(true, new CIPRequest(service, path));
          attributes.push({
            code: i,
            data: reply.data
          });
        } catch (err) {
          if (!err.info || !err.info.status || err.info.status.code !== 20) {
            return resolver.reject(err);
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
          internal: false
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
        this.forward(response.data.slice(response.data.readUInt8(0)), context.info, context.context);
        return;
      }
      // throw new Error('Currently only supports forwarding PCCC requests');
    }

    const callback = this.callbackForContext(context);
    if (callback != null) {
      callback(null, data, info);
      return true;
    }

    this.forward(data, info, context);
  }


  static Send(layer, connected, request, callback, timeout) {
    let context;
    if (typeof callback === 'function') {
      context = layer.contextCallback((error, message) => {
        if (error) {
          callback(error, message);
        } else {
          const res = request.response(message, 0);
          callback(res.status.error ? res.status.description : null, res);
        }
      }, null, timeout);
    }

    layer.send(request.encode(), { connected }, false, context);
  }
}

CIPLayer.EPath = EPath;

module.exports = CIPLayer;