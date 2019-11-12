'use strict';

const CIP = require('./CIP');
const Identity = require('./Identity');
const Layer = require('../../Stack/Layers/Layer');
const MessageRouter = require('./MessageRouter');


class CIPLayer extends Layer {
  identity(callback) {
    return Layer.CallbackPromise(callback, resolver => {
      const service = CIP.Services.GetAttributesAll;
      
      const path = Buffer.from([
        0x20, // Logical Segment - Class ID
        0x01, // Identity class
        0x24, // Logical Segment - Instance ID 
        0x01  // Instance ID
      ]);

      CIPLayer.send(this, false, service, path, null, function (error, reply) {
        if (error) {
          resolver.reject(error, reply);
        } else {
          Identity.ParseInstanceAttributesAll(reply.data, 0, (err, value) => {
            if (err) {
              resolver.reject(err, reply);
            } else {
              resolver.resolve(value);
            }
          });
        }
      });
    });
  }

  supportedObjects(callback) {
    return Layer.CallbackPromise(callback, resolver => {
      const service = CIP.Services.GetAttributeSingle;

      const path = Buffer.from([
        0x20, // Logical Segment - Class ID
        0x02, // Message Router class
        0x24, // Logical Segment - Instance ID 
        0x01, // Instance ID
        0x30, // Logical Segment - Attribute ID
        0x01  // Attribute 1
      ]);

      CIPLayer.send(this, true, service, path, null, (error, reply) => {
        if (error) {
          resolver.reject(error, reply);
        } else {
          try {
            const data = reply.data;
            const res = [];
            let offset = 0;

            const objectCount = data.readUInt16LE(offset); offset += 2;

            for (let i = 0; i < objectCount; i++) {
              const classID = data.readUInt16LE(offset); offset += 2;
              res.push({
                id: classID,
                name: CIP.ClassNames[classID] || 'Unknown'
              });
            }

            resolver.resolve(res.sort(function (o1, o2) {
              if (o1.id < o2.id) return -1;
              else if (o1.id > o2.id) return 1;
              return 0;
            }));

          } catch (err) {
            resolver.reject(err.message, reply);
          }
        }
      });
    });
  }


  handleData(data, info, context) {
    // if (context) {
    //   const callback = this.callbackForContext(context);
    //   if (callback != null) {
    //     callback(null, data, info);
    //   }
    // }
    // else {
    //   console.log('Unhandled message, context should not be null');
    // }


    const callback = this.callbackForContext(context);
    if (callback != null) {
      callback(null, data, info);
    }

    // this.forward(data, info, context);
    


    // if (context == null) {
    //   throw new Error('Unhandled message, context should not be null');
    // }

    // const callback = this.callbackForContext(context);
    // if (callback != null) {
    //   callback(null, data, info);
    // }
  }


  static send(layer, connected, service, path, data, callback, timeout) {
    const request = MessageRouter.Request(service, path, data);

    const info = { connected };

    layer.send(request, info, false, typeof callback === 'function' ? layer.contextCallback((error, message) => {
      if (error) {
        callback(error);
      } else {
        const reply = MessageRouter.Reply(message);

        if (reply.service.code !== service) {
          return callback('Response service does not match request service. This should never happen.', reply);
        }

        if (reply.status.error) {
          callback(reply.status.description || true, reply);
        } else {
          callback(null, reply);
        }
      }
    }, null, timeout) : undefined);
  }
}

module.exports = CIPLayer;