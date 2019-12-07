'use strict';

const EPath = require('./EPath');
const CIP = require('./CIP');
const Layer = require('./../../Layer');
const Identity = require('./Identity');
const MessageRouter = require('./MessageRouter');


class CIPLayer extends Layer {
  identity(callback) {
    return Layer.CallbackPromise(callback, resolver => {
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
    return Layer.CallbackPromise(callback, resolver => {
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
    return Layer.CallbackPromise(callback, resolver => {
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
              offset = CIP.Decode(CIP.DataTypes.UINT, data, offset, val => info.maximumConnections = val);

              let connectionCount;
              offset = CIP.Decode(CIP.DataTypes.UINT, data, offset, val => connectionCount = val);

              const connectionIDs = [];
              for (let i = 0; i < connectionCount; i++) {
                offset = CIP.Decode(CIP.DataTypes.UINT, data, offset, val => connectionIDs.push(val));
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


  messageRouterClassAttributes(callback) {
    return Layer.CallbackPromise(callback, resolver => {
      const service = CIP.CommonServices.GetAttributesAll;

      const path = EPath.Encode(
        CIP.Classes.Identity,
        // null,
        // 0x04
      );

      console.log(path);

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
      console.log(arguments);
      console.log(`CIP layer unhandled data`);
      return false;
    }
  }


  static send(layer, connected, service, path, data, callback, timeout) {
    const request = MessageRouter.Request(service, path, data);
    // console.log(request);
    // console.log(new Error());

    const info = { connected };

    layer.send(request, info, false, typeof callback === 'function' ? layer.contextCallback((error, message) => {
      if (error) {
        callback(error);
      } else {
        // console.log('');
        // console.log(request);
        const reply = MessageRouter.Reply(message);
        // console.log(reply);

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