'use strict';

const { CallbackPromise } = require('../../../utils');
const EPath = require('./EPath');
const CIP = require('./CIP');
const Layer = require('./../../Layer');
const Identity = require('./Identity');
const MessageRouter = require('./MessageRouter');

// let requestCount = 0;
// let totalBytesOut = 0;
// let totalBytesIn = 0;

class CIPLayer extends Layer {
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
      
      const path = EPath.Encode(
        CIP.Classes.Identity,
        0x01
      );

      CIPLayer.send(this, false, service, path, null, function (error, reply) {
        if (error) {
          resolver.reject(error, reply);
        } else {
          try {
            Identity.ParseInstanceAttributesAll(reply.data, 0, value => resolver.resolve(value));
          } catch (err) {
            resolver.reject(err, reply);
          }
        }
      });
    });
  }


  supportedClasses(callback) {
    return CallbackPromise(callback, resolver => {
      const service = CIP.CommonServices.GetAttributeSingle;

      const path = EPath.Encode(
        CIP.Classes.MessageRouter,
        0x01,
        0x01
      );

      CIPLayer.send(this, true, service, path, null, (error, reply) => {
        if (error) {
          resolver.reject(error, reply);
        } else {
          try {
            MessageRouter.DecodeSupportedObjects(reply.data, 0, function(classes) {
              resolver.resolve(classes);
            });
          } catch (err) {
            resolver.reject(err, reply);
          }
        }
      });
    });
  }


  messageRouterInstanceAttributes(callback) {
    return CallbackPromise(callback, resolver => {
      const service = CIP.CommonServices.GetAttributesAll;

      const path = EPath.Encode(
        CIP.Classes.MessageRouter,
        0x01
      );

      CIPLayer.send(this, true, service, path, null, (error, reply) => {
        if (error) {
          resolver.reject(error, reply);
        } else {
          try {
            const data = reply.data;
            let length = data.length;
            let offset = 0;

            const info = {};

            /** object list may not be supported */
            if (offset < length) {
              offset = MessageRouter.DecodeSupportedObjects(reply.data, 0, function (classes) {
                info.classes = classes;
              });
            }   

            /** number active may not be supported */
            if (offset < length) {
              offset = CIP.Decode(CIP.DataType.UINT, data, offset, val => info.maximumConnections = val);

              let connectionCount;
              offset = CIP.Decode(CIP.DataType.UINT, data, offset, val => connectionCount = val);

              const connectionIDs = [];
              for (let i = 0; i < connectionCount; i++) {
                offset = CIP.Decode(CIP.DataType.UINT, data, offset, val => connectionIDs.push(val));
              }

              info.connections = connectionIDs;
            }

            resolver.resolve(info);
          } catch (err) {
            resolver.reject(err, reply);
          }
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
      const service = CIP.CommonServices.GetAttributeSingle;

      const attributes = [];

      for (let i = 1; i < maxAttribute; i++) {
        try {
          const path = EPath.Encode(
            classCode,
            instanceID,
            i
          );
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

      const path = EPath.Encode(
        CIP.Classes.Identity,
        0,
        // 0x04
      );

      CIPLayer.send(this, true, service, path, null, (error, reply) => {
        if (error) {
          resolver.reject(error, reply);
        } else {
          try {
            console.log(reply);
            // Identity.ParseInstanceAttributesAll(reply.data, 0, function (info) {
            //   resolver.resolve(info);
            // });
            resolver.resolve(reply);
            // MessageRouter.DecodeGetAttributesAll(reply.data, 0, function(info) {
            //   resolver.resolve(info);
            // });
          } catch (err) {
            resolver.reject(err, reply);
          }
        }
      });
    });
  }



  portTest(callback) {
    return CallbackPromise(callback, resolver => {
      const service = CIP.CommonServices.GetAttributesAll;

      const path = EPath.Encode(
        CIP.Classes.Port,
        1,
        // 0x04
      );

      CIPLayer.send(this, true, service, path, null, (error, reply) => {
        if (error) {
          resolver.reject(error, reply);
        } else {
          try {
            console.log(reply);
            // Identity.ParseInstanceAttributesAll(reply.data, 0, function (info) {
            //   resolver.resolve(info);
            // });
            resolver.resolve(reply);
            // MessageRouter.DecodeGetAttributesAll(reply.data, 0, function(info) {
            //   resolver.resolve(info);
            // });
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


  static send(layer, connected, service, path, data, callback, timeout) {
    const request = MessageRouter.Request(service, path, data);

    // console.log('OUT:', request);
    // // console.log('OUT:', JSON.stringify(request));
    // totalBytesOut += request.length;
    // requestCount++;
    // const tmpRequestCount = requestCount;

    const info = { connected };

    layer.send(request, info, false, typeof callback === 'function' ? layer.contextCallback((error, message) => {
      if (error) {
        callback(error);
      } else {
        const reply = MessageRouter.Reply(message);

        // console.log('IN:', message);
        // // console.log('IN:', JSON.stringify(message));
        // // console.log(reply);
        // totalBytesIn += message.length;
        // // console.log(`REQUEST: ${requestCount}, ${totalBytesOut} ${totalBytesIn}`);


        if (reply.service.code !== service) {
          return callback('Response service does not match request service. This should never happen.', reply);
        }

        if (reply.status.error) {
          callback(reply.status.description || 'CIP Error', reply);
        } else {
          callback(null, reply);
        }
      }
    }, null, timeout) : undefined);
  }
}

module.exports = CIPLayer;