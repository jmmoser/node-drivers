'use strict';

const { CallbackPromise, InfoError } = require('../../../../utils');
const Layer = require('../../../Layer');
const EIPPacket = require('./packet');

const {
  CommandCodes,
  CPFItemTypeIDs
} = EIPPacket;


function SendData_Packet(interfaceHandle, timeout, data) {
  const buffer = Buffer.allocUnsafe(data.length + 6);
  buffer.writeUInt32LE(interfaceHandle, 0);
  buffer.writeUInt16LE(timeout, 4);
  data.copy(buffer, 6);
  return buffer;
}

function CPF_UCMM_Packet(data) {
  const buffer = Buffer.allocUnsafe(10 + data.length);
  buffer.writeUInt16LE(2, 0); // One address item and one data item
  buffer.writeUInt16LE(CPFItemTypeIDs.NullAddress, 2); // AddressTypeID = 0 to indicate a UCMM message
  buffer.writeUInt16LE(0, 4); // AddressLength = 0 since UCMM messages use the NULL address item
  buffer.writeUInt16LE(CPFItemTypeIDs.UnconnectedMessage, 6); // DataTypeID = 0x00B2 to encapsulate the UCMM
  buffer.writeUInt16LE(data.length, 8);
  data.copy(buffer, 10);
  return buffer;
}

function CPF_Connected_Packet(connectionIdentifier, data) {
  const buffer = Buffer.allocUnsafe(14 + data.length);
  buffer.writeUInt16LE(2, 0);
  buffer.writeUInt16LE(CPFItemTypeIDs.ConnectedAddress, 2);
  buffer.writeUInt16LE(4, 4);
  buffer.writeUInt32LE(connectionIdentifier, 6);
  buffer.writeUInt16LE(CPFItemTypeIDs.ConnectedMessage, 10);
  buffer.writeUInt16LE(data.length, 12);
  data.copy(buffer, 14);
  return buffer;
}


function SendRRDataRequest(sessionHandle, senderContext, data) {
  // INTERFACE HANDLE SHOULD BE 0 FOR ENCAPSULATING CIP PACKETS
  return EIPPacket.toBuffer(
    CommandCodes.SendRRData, sessionHandle, 0, senderContext, 0, SendData_Packet(0, 0, CPF_UCMM_Packet(data))
  );
}

function SendUnitDataRequest(sessionHandle, interfaceHandle, timeout, connectionIdentifier, data) {
  return EIPPacket.toBuffer(
    CommandCodes.SendUnitData, sessionHandle, 0, null, 0, SendData_Packet(interfaceHandle, timeout, CPF_Connected_Packet(connectionIdentifier, data))
  );
}


const DefaultOptions = {
  tcp: {
    port: 44818
  },
  udp: {
    target: {
      port: 44818
    }
  }
};


class EIPLayer extends Layer {
  constructor(lowerLayer, options) {
    if (lowerLayer == null) {
      throw new Error('EIP layer requires a lower layer')
    }

    super('eip.cip', lowerLayer, null, DefaultOptions);

    this._sessionHandle = 0;
    this._context = Buffer.alloc(8);
    this._userRequests = [];

    setConnectionState(this, 0);
    setupCallbacks(this);

    this.setDefragger(EIPPacket.IsComplete, EIPPacket.Length);
  }


  nop(callback) {
    // no response, used to test underlying transport layer
    return CallbackPromise(callback, resolver => {
      queueUserRequest(this, EIPPacket.NOPRequest(), null, null);
      resolver.resolve();
    });
  }

  listServices(callback) {
    return CallbackPromise(callback, resolver => {
      queueUserRequest(this, EIPPacket.ListServicesRequest(this._context), null, function (error, reply) {
        if (error) {
          resolver.reject(error, reply);
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
    // let timeout = -1;
    let hostsSpecified = false;
    const hosts = [];

    if (arguments.length === 1 && typeof arguments[0] === 'function') {
      callback = arguments[0];
    } else {
      switch (typeof options) {
        case 'number':
          timeout = options;
          break;
        case 'object':
          // timeout = typeof options.timeout === 'number' ? options.timeout : -1;
          if (Array.isArray(options.hosts)) {
            hostsSpecified = true;
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

    const startingTimeout = 2000;
    const resetTimeout = 1000;

    // if (timeout <= 0) {
    //   timeout = startingTimeout;
    // }

    if (hosts.length === 0) {
      hosts.push({});
    }

    const identities = [];

    return CallbackPromise(callback, resolver => {
      let timeoutHandler;

      function finalizer(error, reply) {
        clearTimeout(timeoutHandler);
        if (error) {
          resolver.reject(error, reply);
        } else {
          const sortedIdentities = identities.sort(function (i1, i2) {
            if (i1.socket && i2.socket) {
              const s1 = i1.socket;
              const s2 = i2.socket;

              if (s1.address && s2.address) {
                if (s1.address < s2.address) return -1;
                if (s1.address > s2.address) return 1;
              }
            }
            return 0;
          });

          if (hostsSpecified) {
            resolver.resolve(sortedIdentities);
          } else if (identities.length === 1) {
            resolver.resolve(sortedIdentities[0]);
          } else {
            resolver.resolve(null);
          }
        }
      }

      timeoutHandler = setTimeout(finalizer, startingTimeout);

      function internalListIdentityReplyHandler(error, reply) {
        if (error) {
          finalizer(error, reply);
        } else {
          if (Array.isArray(reply.items) && reply.items.length === 1) {
            identities.push(reply.items[0]);
            clearTimeout(timeoutHandler);
            if (hostsSpecified) {
              timeoutHandler = setTimeout(finalizer, resetTimeout);
              return true;
            } else {
              finalizer();
            }
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


  listInterfaces(callback) {
    return CallbackPromise(callback, resolver => {
      queueUserRequest(this, EIPPacket.ListInterfacesRequest(), null, function (error, reply) {
        if (error) {
          resolver.reject(error, reply);
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

  connect(callback) {
    if (this._connectionState === 2) {
      if (callback) callback();
      return;
    }
    this._connectCallback = callback;
    if (this._connectionState > 0) return;
    setConnectionState(this, 1);
    this.send(EIPPacket.RegisterSessionRequest(this._context), null, true);
  }

  disconnect(callback) {
    return CallbackPromise(callback, resolver => {
      if (this._connectionState !== 0) {
        this.send(EIPPacket.UnregisterSessionRequest(this._sessionHandle, this._context), null, true);
        setConnectionState(this, 0);
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
          const { message, info } = request;

          let fullMessage = null;

          if (info && info.connectionID != null) {
            fullMessage = SendUnitDataRequest(this._sessionHandle, 0, 0, info.connectionID, message);

            if (info.connectionID != null && info.responseID != null) {
              // // this._connectedContexts.set(info.responseID, request.context);

              // this._connectedContexts.set(info.responseID, request.layer);
              this._connectedContexts.set(info.responseID, info.connectionID);
            }
          } else {
            incrementContext(this);
            fullMessage = SendRRDataRequest(this._sessionHandle, this._context, message);

            if (request.context != null) {
              this._unconnectedContexts.set(this._context.toString('hex'), request.context);
            }
          }

          // console.log(fullMessage);
          this.send(fullMessage, null, false);

          setImmediate(() => this.sendNextMessage());
        }
      }
    }
  }

  handleData(data, info, context) {
    // console.log(data);
    const packet = EIPPacket.fromBuffer(data);
    const command = packet.command;

    if (this._userCallbacks.has(command)) {
      const callbacks = this._userCallbacks.get(command);
      // this._userCallbacks.delete(command);
      // callbacks.forEach(callback => {
      //   callback.apply(this, [packet]);
      // });

      const error = packet.status.code !== 0 ? packet.status.description || `EIP error code ${packet.status.code}` : null;

      this._userCallbacks.set(command, callbacks.filter(callback => {
        // const result = callback.apply(this, [error, packet]);
        // return result === true;

        /** `this` is bound to user callbacks  */
        return callback(error, packet);
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

  handleDestroy(error) {
    // console.log(new Error());
    this._userCallbacks.forEach(callbacks => {
      callbacks.forEach(cb => {
        cb(error);
      });
    });
    cleanup(this);
  }
}

module.exports = EIPLayer;


function setConnectionState(layer, state) {
  // console.log(`EIP connection state: ${layer._connectionState} => ${state}`);
  layer._connectionState = state;
}

function cleanup(layer) {
  layer._sessionHandle = 0;
  layer._userCallbacks.clear();
  layer._unconnectedContexts.clear();
  layer._connectedContexts.clear();
  setConnectionState(layer, 0);
}

function setupCallbacks(self) {
  self._callbacks = new Map();
  self._userCallbacks = new Map();
  self._unconnectedContexts = new Map();
  self._connectedContexts = new Map();

  self._callbacks.set(CommandCodes.RegisterSession, packet => {
    // console.log('RegisterSession');
    // console.log(packet);
    if (packet.status.code === 0) {
      setConnectionState(self, 2);
      self._sessionHandle = packet.sessionHandle;
      if (self._connectCallback) self._connectCallback();
      self.sendNextMessage();
      sendUserRequests(self);
    } else {
      setConnectionState(self, 0);
    }
  });

  /** This should never be called, UnregisterSession has no response */
  self._callbacks.set(CommandCodes.UnregisterSession, packet => {
    // console.log('UnregisterSession');
    cleanup(self);
  });

  self._callbacks.set(CommandCodes.SendRRData, packet => {
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

    if (!Array.isArray(packet.items)) {
      console.log('EIP SendRRData response does not have any CPF items');
      console.log(packet);
      self.destroy(new InfoError(packet, packet.status.description));
      return;
    }

    const messageItem = packet.items.find(item => item.type.code === CPFItemTypeIDs.UnconnectedMessage);
    if (messageItem) {
      self.forward(messageItem.data, info, context);
    } else {
      console.log('EIP unhandled SendRRData packet', packet.items);
    }
  });

  self._callbacks.set(CommandCodes.SendUnitData, packet => {
    if (packet.status.code === 0) {
      const addressItem = packet.items.find(item => item.type.code === CPFItemTypeIDs.ConnectedAddress);
      const messageItem = packet.items.find(item => item.type.code === CPFItemTypeIDs.ConnectedMessage);
      // console.log(addressItem);
      // console.log(self._connectedContexts);

      if (addressItem && messageItem) {
        const info = {
          connected: true,
          responseID: addressItem.address,
          connectionID: self._connectedContexts.get(addressItem.address)
        };
        // console.log(info);
        /** DO NOT SEND CONTEXT FOR CONNECTED MESSAGES */
        self.forward(messageItem.data, info);
      } else {
        console.log('EIP unhandled SendUnitData packet', packet);
      }
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
    /* No callback for NOP */
    if (!self._userCallbacks.has(command)) {
      self._userCallbacks.set(command, []);
    }
    self._userCallbacks.get(command).push(callback.bind(self));
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