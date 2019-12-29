'use strict';

const CIPRequest = require('../core/request');
const { CallbackPromise } = require('../../../utils');
const EPath = require('../epath');
const CIP = require('./CIP');
// const {
//   DataType,
//   Decode
// } = require('../datatypes');
const Layer = require('./../../Layer');
const Identity = require('./Identity');
const MessageRouter = require('./MessageRouter');

// let requestCount = 0;
// let totalBytesOut = 0;
// let totalBytesIn = 0;

class CIPLayer extends Layer {
  sendRequest(connected, request, callback) {
    return CallbackPromise(callback, resolver => {
      CIPLayer.SendRequest(this, connected, request, function (error, reply) {
        if (error) {
          resolver.reject(error, reply);
        } else {
          resolver.resolve(reply);
        }
      });
    });
  }

  request(connected, service, path, data, callback) {
    return CallbackPromise(callback, resolver => {
      CIPLayer.send(this, connected, service, path, data, function (error, reply) {
        if (error) {
          resolver.reject(error, reply);
        } else {
          resolver.resolve(reply);
        }
      });
    });
  }

  identity(callback) {
    return CallbackPromise(callback, resolver => {
      const service = CIP.CommonServices.GetAttributesAll;
      
      const path = EPath.Encode(true, [
        new EPath.Segments.Logical.ClassID(CIP.Classes.Identity),
        new EPath.Segments.Logical.InstanceID(0x01)
      ]);

      CIPLayer.send(this, true, service, path, null, function (error, reply) {
        if (error) {
          resolver.reject(error, reply);
        } else {
          try {
            Identity.DecodeInstanceAttributesAll(reply.data, 0, value => resolver.resolve(value));
          } catch (err) {
            resolver.reject(err, reply);
          }
        }
      });
    });
  }


  supportedClasses(callback) {
    return CallbackPromise(callback, resolver => {
      const request = MessageRouter.GetInstanceAttribute(
        1,
        MessageRouter.InstanceAttribute.ObjectList
      );

      CIPLayer.SendRequest(this, true, request, (error, response) => {
        if (error) {
          resolver.reject(error, response);
        } else {
          resolver.resolve(response.value);
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
    //   const service = CIP.CommonServices.GetAttributesAll;
    //   const path = EPath.Encode(
    //     new EPath.Segments.Logical.ClassID(classCode),
    //     new EPath.Segments.Logical.InstanceID(instanceID),
    //   );
    //   const reply = await this.request(true, service, path);

    //   resolver.resolve(reply.data);
    // });

    return CallbackPromise(callback, async resolver => {
      const service = CIP.CommonServices.GetAttributeSingle;

      const attributes = [];

      for (let i = 1; i < maxAttribute; i++) {
        try {
          const path = EPath.Encode(true, [
            new EPath.Segments.Logical.ClassID(classCode),
            new EPath.Segments.Logical.InstanceID(instanceID),
            new EPath.Segments.Logical.AttributeID(i)
          ]);
          const reply = await this.request(true, service, path);
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


  messageRouterClassAttributes(callback) {
    return CallbackPromise(callback, resolver => {
      const service = CIP.CommonServices.GetAttributesAll;

      const path = EPath.Encode(true, [
        new EPath.Segments.Logical.ClassID(CIP.Classes.Identity),
        new EPath.Segments.Logical.InstanceID(0)
      ]);

      CIPLayer.send(this, true, service, path, null, (error, reply) => {
        if (error) {
          resolver.reject(error, reply);
        } else {
          try {
            console.log(reply);
            resolver.resolve(reply);
          } catch (err) {
            resolver.reject(err, reply);
          }
        }
      });
    });
  }


  handleData(data, info, context) {
    const callback = this.callbackForContext(context);
    if (callback != null) {
      callback(null, data, info);
      return true;
    } else {
      // console.log(arguments);
      // console.log(`CIP layer unhandled data`);
      return false;
    }
  }


  static SendRequest(layer, connected, request, callback, timeout) {
    let req;
    if (request instanceof CIPRequest) {
      req = request.encode();
    } else {
      req = request;
    }
    layer.send(req, { connected }, false, typeof callback === 'function' ? layer.contextCallback((error, message) => {
      if (error) {
        callback(error, message);
      } else {
        let reply;
        if (request instanceof CIPRequest) {
          reply = request.response(message, 0);
        } else {
          reply = MessageRouter.Reply(message);
          reply.request = request;
        }

        // const reply = MessageRouter.Reply(message);
        // reply.request = request;

        // console.log('IN:', message);
        // // console.log('IN:', JSON.stringify(message));
        // // console.log(reply);
        // totalBytesIn += message.length;
        // // console.log(`REQUEST: ${requestCount}, ${totalBytesOut} ${totalBytesIn}`);


        // if (reply.service.code !== service) {
        //   return callback('Response service does not match request service. This should never happen.', reply);
        // }

        if (reply.status.error) {
          callback(reply.status.description || 'CIP Error', reply);
        } else {
          callback(null, reply);
        }
      }
    }, null, timeout) : undefined);
  }


  static send(layer, connected, service, path, data, callback, timeout) {
    const cipRequest = new CIPRequest(service, path, data);
    const request = cipRequest.encode();

    const info = { connected };

    layer.send(request, info, false, typeof callback === 'function' ? layer.contextCallback((error, message) => {
      if (error) {
        callback(error, message);
      } else {
        const response = cipRequest.response(message);
        if (response.status.error) {
          callback(response.status.description || 'CIP Error', response);
        } else {
          callback(null, response);
        }
      }
    }, null, timeout) : undefined);
  }

  
}

module.exports = CIPLayer;