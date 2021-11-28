import { CallbackPromise, InfoError } from '../utils.js';
import Layer from './layer.js';
import { LayerNames } from './constants.js';
import EIPPacket from '../core/eip/packet.js';
import CPF from '../core/eip/cpf.js';

const {
  CommandCodes,
} = EIPPacket;

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

function sendUserRequests(self) {
  if (self._connectionState === 0 || self._connectionState === 2) {
    // let buffer;
    let request;
    while ((request = self._userRequests.shift())) { // eslint-disable-line no-cond-assign
      /* overwrite sessionHandle, CIP Vol 2 says it is ignored for some commands
         but I don't believe it is ignored if a session is established */
      const { message, info } = request;
      message.writeUInt32LE(self._sessionHandle, 4);
      self.send(message, info, false);
    }
  }
}

function setupCallbacks(self) {
  self._userCallbacks = new Map();
  self._unconnectedContexts = new Map();
  self._connectedContexts = new Map();
}

function incrementContext(self) {
  for (let i = 0; i < 8; i++) {
    self._context[i] = (self._context[i] + 1) % 0x100;
    if (self._context[i] !== 0) break;
  }
}

function queueUserRequest(self, message, info, callback) {
  const command = EIPPacket.Command(message, { current: 0 });

  if (callback) {
    /* No callback for NOP */
    if (!self._userCallbacks.has(command)) {
      self._userCallbacks.set(command, []);
    }
    self._userCallbacks.get(command).push(callback.bind(self));
  }

  self._userRequests.push({
    message,
    info,
  });

  sendUserRequests(self);
}

const DefaultOptions = {
  tcp: {
    port: 44818,
  },
  udp: {
    target: {
      port: 44818,
    },
  },
};

export default class EIPLayer extends Layer {
  constructor(lowerLayer, options) {
    if (lowerLayer == null) {
      throw new Error('EIP layer requires a lower layer');
    }

    super(LayerNames.EIP, lowerLayer, null, { ...DefaultOptions, ...options });

    this._sessionHandle = 0;
    this._context = Buffer.alloc(8);
    this._userRequests = [];

    setConnectionState(this, 0);
    setupCallbacks(this);

    this.setDefragger(EIPPacket.IsComplete, EIPPacket.Length);

    this._totalSentSinceLastResponse = 0;
  }

  nop(callback) {
    // no response, used to test underlying transport layer
    return CallbackPromise(callback, (resolver) => {
      queueUserRequest(this, EIPPacket.NOPRequest(), null, null);
      resolver.resolve();
    });
  }

  listServices(callback) {
    return CallbackPromise(callback, (resolver) => {
      queueUserRequest(this, EIPPacket.ListServicesRequest(this._context), null, (error, reply) => {
        if (error) {
          resolver.reject(error, reply);
        } else if (Array.isArray(reply.items)) {
          resolver.resolve(reply.items);
        } else {
          resolver.reject('Unexpected result', reply);
        }
      });
    });
  }

  listIdentity(options, callback) {
    let hostsSpecified = false;
    const hosts = [];

    if (arguments.length === 1 && typeof arguments[0] === 'function') {
      callback = arguments[0]; // eslint-disable-line no-param-reassign, prefer-destructuring
    } else {
      switch (typeof options) {
        case 'object':
          if (Array.isArray(options.hosts)) {
            hostsSpecified = true;
            options.hosts.forEach((host) => {
              switch (typeof host) {
                case 'string': {
                  const parts = host.split(':', 2);
                  if (parts.length === 0) {
                    hosts.push({ host: parts[0] });
                  } else {
                    hosts.push({ host: parts[0], port: parts[1] });
                  }
                  break;
                }
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

    if (hosts.length === 0) {
      hosts.push({});
    }

    const identities = [];

    return CallbackPromise(callback, (resolver) => {
      let timeoutHandler;

      function finalizer(error, reply) {
        clearTimeout(timeoutHandler);
        if (error) {
          resolver.reject(error, reply);
        } else {
          const sortedIdentities = identities.sort((i1, i2) => {
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
        } else if (Array.isArray(reply.items) && reply.items.length === 1) {
          identities.push(reply.items[0]);
          clearTimeout(timeoutHandler);
          if (hostsSpecified) {
            timeoutHandler = setTimeout(finalizer, resetTimeout);
            return;
            // return true;
          }
          finalizer();
        } else {
          finalizer('Unexpected result', reply);
        }
      }

      hosts.forEach((host, idx) => {
        const cb = idx === 0 ? internalListIdentityReplyHandler : null;
        queueUserRequest(this, EIPPacket.ListIdentityRequest(), host, cb);
      });
    });
  }

  listInterfaces(callback) {
    return CallbackPromise(callback, (resolver) => {
      queueUserRequest(this, EIPPacket.ListInterfacesRequest(), null, (error, reply) => {
        if (error) {
          resolver.reject(error, reply);
        } else if (Array.isArray(reply.items)) {
          resolver.resolve(reply.items);
        } else {
          resolver.reject('Unexpected result', reply);
        }
      });
    });
  }

  indicateStatus(callback) {
    return CallbackPromise(callback, (resolver) => {
      queueUserRequest(this, EIPPacket.IndicateStatusRequest(), null, (error, reply) => {
        if (error) {
          resolver.reject(error, reply);
        } else if (Array.isArray(reply.items)) {
          resolver.resolve(reply.items);
        } else {
          resolver.reject('Unexpected result', reply);
        }
      });
    });
  }

  cancel(callback) {
    return CallbackPromise(callback, (resolver) => {
      queueUserRequest(this, EIPPacket.CancelRequest(), null, (error, reply) => {
        if (error) {
          resolver.reject(error, reply);
        } else if (Array.isArray(reply.items)) {
          resolver.resolve(reply.items);
        } else {
          resolver.reject('Unexpected result', reply);
        }
      });
    });
  }

  // TODO: can this use CallbackPromise?
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
    return CallbackPromise(callback, (resolver) => {
      if (this._connectionState !== 0) {
        this.send(
          EIPPacket.UnregisterSessionRequest(this._sessionHandle, this._context),
          null,
          true,
        );
        setConnectionState(this, 0);
      }
      resolver.resolve();
    });
  }

  sendNextMessage() {
    if (this._totalSentSinceLastResponse > 1500) {
      return;
    }

    if (this.hasRequest()) {
      if (this._connectionState === 0) {
        this.connect();
      } else if (this._connectionState === 2) {
        let fullMessage = null;

        for (;;) {
          const request = this.getNextRequest(true);

          if (request) {
            const { message, info } = request;

            let buffer;
            if (info && info.connectionID != null) {
              buffer = EIPPacket.EncodeSendUnitDataMessage(
                this._sessionHandle,
                0,
                0,
                info.connectionID,
                message,
              );

              if (!fullMessage) {
                fullMessage = buffer;
              } else if (fullMessage.length + buffer.length <= 500) {
                fullMessage = Buffer.concat([fullMessage, buffer]);
              } else {
                break;
              }

              if (info.connectionID != null && info.responseID != null) {
                this._connectedContexts.set(info.responseID, info.connectionID);
              }
            } else {
              incrementContext(this);
              buffer = EIPPacket.EncodeSendRRDataMessage(
                this._sessionHandle,
                this._context,
                message,
              );

              if (!fullMessage) {
                fullMessage = buffer;
              } else if (fullMessage.length + buffer.length <= 500) {
                fullMessage = Buffer.concat([fullMessage, buffer]);
              } else {
                break;
              }

              if (request.context != null) {
                this._unconnectedContexts.set(this._context.toString('hex'), request.context);
              }
            }
          } else {
            break;
          }

          this.getNextRequest();

          if (this._totalSentSinceLastResponse + fullMessage.length > 1500) {
            break;
          }
        }

        this._totalSentSinceLastResponse += fullMessage.length;
        this.send(fullMessage, null, false);
      }
    }
  }

  // sendNextMessage() {
  //   if (this.hasRequest()) {
  //     if (this._connectionState === 0) {
  //       this.connect();
  //     } else if (this._connectionState === 2) {
  //       const request = this.getNextRequest();

  //       if (request) {
  //         const { message, info } = request;

  //         let fullMessage = null;

  //         if (info && info.connectionID != null) {
  //           fullMessage = EIPPacket.EncodeSendUnitDataMessage(
  //             this._sessionHandle,
  //             0,
  //             0,
  //             info.connectionID,
  //             message,
  //           );

  //           if (info.connectionID != null && info.responseID != null) {
  //             this._connectedContexts.set(info.responseID, info.connectionID);
  //           }
  //         } else {
  //           incrementContext(this);
  //           fullMessage = EIPPacket.EncodeSendRRDataMessage(
  //             this._sessionHandle,
  //             this._context,
  //             message,
  //           );

  //           if (request.context != null) {
  //             this._unconnectedContexts.set(this._context.toString('hex'), request.context);
  //           }
  //         }

  //         this.send(fullMessage, null, false);
  //       }
  //     }
  //   }
  // }

  handleData(data /* , info, context */) {
    const packet = EIPPacket.fromBuffer(data, { current: 0 });
    const { code: command } = packet.command;

    switch (command) {
      case CommandCodes.UnregisterSession:
        /** This should never be called, UnregisterSession has no response */
        cleanup(this);
        break;
      case CommandCodes.RegisterSession:
        if (packet.status.code === 0) {
          setConnectionState(this, 2);
          this._sessionHandle = packet.sessionHandle;
          if (this._connectCallback) this._connectCallback();
          this.sendNextMessage();
          sendUserRequests(this);
        } else {
          setConnectionState(this, 0);
        }
        break;
      case CommandCodes.SendRRData: {
        const info = { connected: false };
        const senderContext = packet.senderContext.toString('hex');
        let context = null; // context can be null if only one upper layer
        if (this._unconnectedContexts.has(senderContext)) {
          context = this._unconnectedContexts.get(senderContext);
          this._unconnectedContexts.delete(senderContext);
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
          this.destroy(new InfoError(packet, packet.status.description));
        } else {
          const messageItem = packet.items.find(
            (item) => item.type.code === CPF.ItemTypeIDs.UnconnectedMessage,
          );
          if (messageItem) {
            this.forward(messageItem.data, info, context);
          } else {
            console.log('EIP unhandled SendRRData packet', packet.items);
          }
        }

        break;
      }
      case CommandCodes.SendUnitData: {
        if (packet.status.code === 0) {
          const addressItem = packet.items.find(
            (item) => item.type.code === CPF.ItemTypeIDs.ConnectedAddress,
          );
          const messageItem = packet.items.find(
            (item) => item.type.code === CPF.ItemTypeIDs.ConnectedMessage,
          );

          if (addressItem && messageItem) {
            const info = {
              connected: true,
              responseID: addressItem.address,
              connectionID: this._connectedContexts.get(addressItem.address),
            };
            // console.log(info);
            /** DO NOT SEND CONTEXT FOR CONNECTED MESSAGES */
            this.forward(messageItem.data, info);
          } else {
            console.log('EIP unhandled SendUnitData packet', packet);
          }
        } else {
          console.log('EIPLayer Error: Packet Status:');
          console.log(packet);
        }
        break;
      }
      case CommandCodes.Cancel:
      case CommandCodes.IndicateStatus:
      case CommandCodes.NOP:
      case CommandCodes.ListIdentity:
      case CommandCodes.ListInterfaces:
      case CommandCodes.ListServices: {
        const callbacks = this._userCallbacks.get(command);

        const error = packet.status.code !== 0 ? packet.status.description || `EIP error code ${packet.status.code}` : null;

        this._userCallbacks.set(command, callbacks.filter((callback) => callback(error, packet)));
        break;
      }
      default:
        throw new Error(`EIP invalid or unsupported packet received with command: ${command}`);
    }

    this._totalSentSinceLastResponse = 0;
    this.sendNextMessage();
  }

  handleDestroy(error) {
    this._userCallbacks.forEach((callbacks) => {
      callbacks.forEach((cb) => cb(error));
    });
    cleanup(this);
  }
}