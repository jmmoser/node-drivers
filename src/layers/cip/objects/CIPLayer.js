'use strict';

const CIPRequest = require('../core/request');
const { CommonServiceCodes } = require('../core/constants');
const { CallbackPromise } = require('../../../utils');
const EPath = require('../epath');
const Layer = require('./../../Layer');

// let requestCount = 0;
// let totalBytesOut = 0;
// let totalBytesIn = 0;

class CIPLayer extends Layer {
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

    // return CallbackPromise(callback, async resolver => {
    //   const service = CommonServiceCodes.GetAttributesAll;
    //   const path = EPath.Encode(
    //     new EPath.Segments.Logical.ClassID(classCode),
    //     new EPath.Segments.Logical.InstanceID(instanceID),
    //   );
    //   const reply = await this.sendRequest(true, new CIPRequest(service, path));

    //   resolver.resolve(reply.data);
    // });

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
          } else {
            //
          }
        }
      }

      resolver.resolve(attributes);
    });
  }


  handleData(data, info, context) {
    const callback = this.callbackForContext(context);
    if (callback != null) {
      callback(null, data, info);
      return true;
    }
    // console.log(arguments);
    // console.log(`CIP layer unhandled data`);
    return false;
  }


  static Send(layer, connected, request, callback, timeout) {
    layer.send(request.encode(), { connected }, false, typeof callback === 'function' ? layer.contextCallback((error, message) => {
      if (error) {
        callback(error, message);
      } else {
        const response = request.response(message, 0);

        if (response.status.error) {
          callback( response.status.description || 'CIP Error', response);
        } else {
          callback(null, response);
        }
      }
    }, null, timeout) : undefined);
  }
}

module.exports = CIPLayer;