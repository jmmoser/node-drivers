'use strict';

const Layer = require('./Layer');
const EIPPacket = require('../Packets/EIPPacket');
const EIPCommand = EIPPacket.Command;


function SendData_Packet(interfaceHandle, timeout, data) {
  const buffer = Buffer.alloc(data.length + 6);
  buffer.writeUInt32LE(interfaceHandle, 0);
  buffer.writeUInt16LE(timeout, 4);
  data.copy(buffer, 6);
  return buffer;
}

function CPF_UCMM_Packet(data) {
  const buffer = Buffer.alloc(10 + data.length);
  buffer.writeUInt16LE(2, 0); // One address item and one data item
  buffer.writeUInt16LE(EIPPacket.CPFItemID.NullAddress, 2); // AddressTypeID = 0 to indicate a UCMM message
  buffer.writeUInt16LE(0, 4); // AddressLength = 0 since UCMM messages use the NULL address item
  buffer.writeUInt16LE(EIPPacket.CPFItemID.UnconnectedMessage, 6); // DataTypeID = 0x00B2 to encapsulate the UCMM
  buffer.writeUInt16LE(data.length, 8);
  data.copy(buffer, 10);
  return buffer;
}

function CPF_Connected_Packet(connectionIdentifier, data) {
  const buffer = Buffer.alloc(14 + data.length);
  buffer.writeUInt16LE(2, 0);
  buffer.writeUInt16LE(EIPPacket.CPFItemID.ConnectedAddress, 2);
  buffer.writeUInt16LE(4, 4);
  buffer.writeUInt32LE(connectionIdentifier, 6);
  buffer.writeUInt16LE(EIPPacket.CPFItemID.ConnectedMessage, 10);
  buffer.writeUInt16LE(data.length, 12);
  data.copy(buffer, 14);
  return buffer;
}


function SendRRDataRequest(sessionHandle, senderContext, data) {
  // INTERFACE HANDLE SHOULD BE 0 FOR ENCAPSULATING CIP PACKETS
  // const packet = new EIPPacket();
  // packet.command = EIPCommand.SendRRData;
  // packet.sessionHandle = sessionHandle;
  // packet.senderContext = senderContext;
  // packet.data = SendData_Packet(0, 0, CPF_UCMM_Packet(data));
  // return packet.toBuffer();

  return EIPPacket.toBuffer(
    EIPCommand.SendRRData, sessionHandle, 0, senderContext, 0, SendData_Packet(0, 0, CPF_UCMM_Packet(data))
  );
}

function SendUnitDataRequest(sessionHandle, interfaceHandle, timeout, connectionIdentifier, data) {
  // const packet = new EIPPacket();
  // packet.command = EIPCommand.SendUnitData;
  // packet.sessionHandle = sessionHandle;
  // packet.data = SendData_Packet(interfaceHandle, timeout, CPF_Connected_Packet(connectionIdentifier, data));
  // return packet.toBuffer();
  return EIPPacket.toBuffer(
    EIPCommand.SendUnitData, sessionHandle, 0, null, 0, SendData_Packet(interfaceHandle, timeout, CPF_Connected_Packet(connectionIdentifier, data))
  );
}


class EIPLayer extends Layer {
  constructor(lowerLayer) {
    super(lowerLayer);

    this._sessionHandle = 0;
    this._connectionState = 0;
    this._context = Buffer.alloc(8);
    this._userRequests = [];

    setupCallbacks(this);

    this.setDefragger(EIPPacket.IsComplete, EIPPacket.Length);
  }


  nop(callback) {
    // no response, used to test underlying transport layer
    return Layer.CallbackPromise(callback, resolver => {
      queueUserRequest(this, EIPPacket.NOPRequest(), null, null);
      resolver.resolve();
    });
  }

  listServices(callback) {
    return Layer.CallbackPromise(callback, resolver => {
      queueUserRequest(this, EIPPacket.ListServicesRequest(this._context), null, function(reply) {
        if (reply.status.code !== 0) {
          resolver.reject(reply.status.description, reply);
        } else {
          if (Array.isArray(reply.items)) {
            resolver.resolve(reply.items);
          } else {
            resolver.reject('Unexpected result', reply);
          }
        }
      });
    });
  }

  listIdentity(options, callback) {
    let timeout = -1;
    const hosts = [];

    if (arguments.length === 1 && typeof arguments[0] === 'function') {
      callback = arguments[0];
    } else {
      switch (typeof options) {
        case 'number':
          timeout = options;
          break;
        case 'object':
          timeout = typeof options.timeout === 'number' ? options.timeout : -1;
          if (Array.isArray(options.hosts)) {
            options.hosts.forEach(host => {
              switch (typeof host) {
                case 'string':
                  const parts = host.split(':', 2);
                  if (parts.length === 0) {
                    hosts.push({ host: parts[0] });
                  } else {
                    hosts.push({ host: parts[0], port: parts[1] });
                  }
                  break;
                case 'object':
                  hosts.push(host);
                  break;
                default:
                  break;
              }
            });
          }
          break;
        default:
          break;
      }
    }

    if (timeout <= 0) {
      timeout = 2000;
    }

    if (hosts.length === 0) {
      hosts.push({});
    }

    const identities = [];

    return Layer.CallbackPromise(callback, resolver => {
      let timeoutHandler;

      function finalizer(error) {
        clearTimeout(timeoutHandler);
        if (error) {
          resolver.reject(error.message, error.info);
        } else {
          resolver.resolve(identities.sort(function(i1, i2) {
            if (i1.socket && i2.socket) {
              const s1 = i1.socket;
              const s2 = i2.socket;

              if (s1.address && s2.address) {
                if (s1.address < s2.address) return -1;
                if (s1.address > s2.address) return 1;
              }
            }
            return 0;
          }));
        }
      }

      timeoutHandler = setTimeout(finalizer, timeout);

      function internalListIdentityReplyHandler(reply) {
        if (reply.status.code !== 0) {
          finalizer(reply.status.description, reply);
        } else {
          if (Array.isArray(reply.items) && reply.items.length === 1) {
            identities.push(reply.items[0]);
            return true;
          } else {
            finalizer('Unexpected result', reply);
          }
        }
      }

      hosts.forEach((host, idx) => {
        const cb = idx === 0 ? internalListIdentityReplyHandler : null;
        queueUserRequest(this, EIPPacket.ListIdentityRequest(), host, cb);
      });
    });
  }

  // listIdentity(options, callback) {
  //   let timeout = -1;
  //   let host = null;
  //   let port = null;

  //   if (arguments.length === 1 && typeof arguments[0] === 'function') {
  //     callback = arguments[0];
  //   } else {
  //     switch (typeof options) {
  //       case 'number':
  //         timeout = options;
  //         break;
  //       case 'object':
  //         timeout = typeof options.timeout === 'number' ? options.timeout : -1;
  //         host = typeof options.host === 'string' ? options.host : null;
  //         port = typeof options.port === 'number' ? options.port : null;
  //         break;
  //       default:
  //         break;
  //     }
  //   }

  //   const shouldBroadcast = timeout > 0;
  //   const identities = [];

  //   return Layer.CallbackPromise(callback, resolver => {
  //     let timeoutHandler;

  //     function finalizer(error) {
  //       clearTimeout(timeoutHandler);
  //       if (error) {
  //         resolver.reject(error.message, error.info);
  //       } else {
  //         resolver.resolve(identities);
  //       }
  //     }

  //     if (shouldBroadcast) {
  //       timeoutHandler = setTimeout(finalizer, timeout)
  //     }

  //     const info = {
  //       host,
  //       port
  //     };

  //     queueUserRequest(this, EIPPacket.ListIdentityRequest(), info, function(reply) {
  //       if (reply.status.code !== 0) {
  //         finalizer(reply.status.description, reply);
  //       } else {
  //         if (Array.isArray(reply.items) && reply.items.length === 1) {
  //           identities.push(reply.items[0]);
  //           if (shouldBroadcast) {
  //             return true;
  //           } else {
  //             finalizer();
  //           }
  //         } else {
  //           finalizer('Unexpected result', reply);
  //         }
  //       }
  //     });
  //   });
  // }

  listInterfaces(callback) {
    return Layer.CallbackPromise(callback, resolver => {
      queueUserRequest(this, EIPPacket.ListInterfacesRequest(), null, function (reply) {
        if (reply.status.code !== 0) {
          resolver.reject(reply.status.description, reply);
        } else {
          if (Array.isArray(reply.items)) {
            resolver.resolve(reply.items);
          } else {
            resolver.reject('Unexpected result', reply);
          }
        }
      });
    });
  }

  indicateStatus(callback) {
    return Layer.CallbackPromise(callback, resolver => {
      console.log(reply);
      queueUserRequest(this, EIPPacket.Ind)
    });
  }


  connect(callback) {
    if (this._connectionState === 2) {
      if (callback) callback();
      return;
    }
    this._connectCallback = callback;
    if (this._connectionState > 0) return;
    this._connectionState = 1;
    this.send(EIPPacket.RegisterSessionRequest(this._context), null, true);
  }

  disconnect(callback) {
    return Layer.CallbackPromise(callback, resolver => {
      if (this._connectionState !== 0) {
        this._connectionState = 0;
        this.send(EIPPacket.UnregisterSessionRequest(this._sessionHandle, this._context), null, true);
      }
      resolver.resolve();
    });
  }

  sendNextMessage() {
    if (this.hasRequest()) {
      if (this._connectionState === 0) {
        this.connect();
      } else if (this._connectionState === 2) {
        const request = this.getNextRequest();

        if (request) {
          const message = request.message;
          const info = request.info;

          let fullMessage = null;

          if (info.connectionID != null) {
            fullMessage = SendUnitDataRequest(this._sessionHandle, 0, 0, info.connectionID, message);
            if (request.context != null && info.responseID != null) {
              this._connectedContexts.set(info.responseID, request.context);
            }
          } else {
            incrementContext(this);
            fullMessage = SendRRDataRequest(this._sessionHandle, this._context, message);

            if (request.context != null) {
              this._unconnectedContexts.set(this._context.toString('hex'), request.context);
            }
          }

          this.send(fullMessage, null, false);

          setImmediate(() => this.sendNextMessage());
        }
      }
    }
  }

  handleData(data, info, context) {
    const packet = EIPPacket.fromBuffer(data);
    const command = packet.command;

    if (this._userCallbacks.has(command)) {
      const callbacks = this._userCallbacks.get(command);
      // this._userCallbacks.delete(command);
      // callbacks.forEach(callback => {
      //   callback.apply(this, [packet]);
      // });

      this._userCallbacks.set(command, callbacks.filter(callback => {
        const result = callback.apply(this, [packet]);
        return result === true;
      }));

    } else if (this._callbacks.has(command)) {
      this._callbacks.get(command)(packet);
    } else {
      console.log('EIP Error: Unhandled packet:');
      console.log(packet);
      console.log(this._callbacks);
      console.log(data)
    }
  }
}

module.exports = EIPLayer;


function setupCallbacks(self) {
  self._callbacks = new Map();
  self._userCallbacks = new Map();
  self._unconnectedContexts = new Map();
  self._connectedContexts = new Map();

  self._callbacks.set(EIPCommand.RegisterSession, packet => {
    // console.log('RegisterSession');
    // console.log(packet);
    if (packet.status.code === 0) {
      self._connectionState = 2;
      self._sessionHandle = packet.sessionHandle;
      if (self._connectCallback) self._connectCallback();
      self.sendNextMessage();
      sendUserRequests(self);
    } else {
      self._connectionState = 0;
    }
  });

  self._callbacks.set(EIPCommand.UnregisterSession, packet => {
    // console.log('UnregisterSession');
    self._connectionState = 0;
    self._sessionHandle = 0;
  });

  self._callbacks.set(EIPCommand.SendRRData, packet => {
    // console.log('SendRRData');

    const info = { connected: false };
    const senderContext = packet.senderContext.toString('hex');
    let context = null; // context can be null if only one upper layer
    if (self._unconnectedContexts.has(senderContext)) {
      context = self._unconnectedContexts.get(senderContext);
      self._unconnectedContexts.delete(senderContext);
    }
    // else {
    //   console.log('EIPLayer Error: no Sender Context available:');
    //   console.log(packet);
    //   console.log(senderContext);
    //   console.log(self._unconnectedContexts);
    // }

    self.forward(packet.items[1].data, info, context);
  });

  self._callbacks.set(EIPCommand.SendUnitData, packet => {
    // console.log('SendUnitData');
    if (packet.status.code === 0) {
      const info = {
        connected: true,
        connectionID: packet.items[0].address
      };
      const context = self._connectedContexts.get(info.connectionID);
      self.forward(packet.items[1].data, info, context);
    } else {
      console.log('EIPLayer Error: Packet Status:');
      console.log(packet);
    }
  });
}


function incrementContext(self) {
  for (let i = 0; i < 8; i++) {
    self._context[i] = (self._context[i] + 1) % 0x100;
    if (self._context[i] !== 0) break;
  }
}


function queueUserRequest(self, message, info, callback) {
  const command = EIPPacket.CommandFromBuffer(message);

  if (callback) {
    /* no callback for NOP */
    if (!self._userCallbacks.has(command)) {
      self._userCallbacks.set(command, []);
    }
    self._userCallbacks.get(command).push(callback);
  }

  self._userRequests.push({
    message,
    info
  });

  sendUserRequests(self);
}


function sendUserRequests(self) {
  if (self._connectionState === 0 || self._connectionState === 2) {
    // let buffer;
    let request;
    while ((request = self._userRequests.shift())) {
      /* overwrite sessionHandle, CIP Vol 2 says it is ignored for some commands but I don't believe it is ignored if a session is established */
      const { message, info } = request;
      message.writeUInt32LE(self._sessionHandle, 4);
      self.send(message, info, false);
    }
  }
}