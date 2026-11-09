import { CallbackPromise, InfoError } from '../../../../utils.js';
import Layer from '../../../Layer.js';
import EIPPacket from './packet.js';

import CPF from './cpf.js';
import { ConnectionStates, createStateMachine } from '../../../connectionState.js';

const {
  CommandCodes,
} = EIPPacket;

function SendDataPacket(interfaceHandle, timeout, data) {
  const buffer = Buffer.allocUnsafe(data.length + 6);
  buffer.writeUInt32LE(interfaceHandle, 0);
  buffer.writeUInt16LE(timeout, 4);
  data.copy(buffer, 6);
  return buffer;
}

function EncodeSendRRDataMessage(sessionHandle, senderContext, data) {
  // INTERFACE HANDLE SHOULD BE 0 FOR ENCAPSULATING CIP PACKETS
  const cpfMessage = CPF.Packet.EncodeUCMM(data);
  const dataPacket = SendDataPacket(0, 0, cpfMessage);
  return EIPPacket.Encode(CommandCodes.SendRRData, sessionHandle, 0, senderContext, 0, dataPacket);
}

function EncodeSendUnitDataMessage(
  sessionHandle, interfaceHandle, timeout, connectionIdentifier, data,
) {
  const cpfMessage = CPF.Packet.EncodeConnected(connectionIdentifier, data);
  const dataPacket = SendDataPacket(interfaceHandle, timeout, cpfMessage);
  return EIPPacket.Encode(CommandCodes.SendUnitData, sessionHandle, 0, null, 0, dataPacket);
}

/** Session states: Disconnected (no session), Connecting (RegisterSession
 * in flight), Connected (session registered) */
const SessionStates = ConnectionStates;

const setConnectionState = createStateMachine('EIP layer', {
  [SessionStates.Disconnected]: [SessionStates.Connecting],
  [SessionStates.Connecting]: [SessionStates.Connected, SessionStates.Disconnected],
  [SessionStates.Connected]: [SessionStates.Disconnected],
});

function flushConnectCallbacks(layer, error) {
  const connectCallbacks = layer._connectCallbacks;
  layer._connectCallbacks = [];
  connectCallbacks.forEach((connectCallback) => connectCallback(error));
}

function cleanup(layer) {
  layer._sessionHandle = 0;
  /** replies to abandoned registrations will never arrive on a new transport */
  layer._staleRegistrations = 0;
  layer._userCallbacks.clear();
  layer._unconnectedContexts.clear();
  layer._connectedContexts.clear();
  setConnectionState(layer, SessionStates.Disconnected);
}

function sendUserRequests(self) {
  /** user commands do not need a session, but hold them while a
   * session is being registered so they carry its handle */
  if (self._connectionState !== SessionStates.Connecting) {
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
  self._callbacks = new Map();
  self._userCallbacks = new Map();
  self._unconnectedContexts = new Map();
  self._connectedContexts = new Map();

  self._callbacks.set(CommandCodes.RegisterSession, (packet) => {
    // console.log('RegisterSession');
    // console.log(packet);
    if (self._staleRegistrations > 0) {
      /** reply to a RegisterSession abandoned by disconnect(); replies
       * arrive in request order, so it is the oldest one outstanding */
      self._staleRegistrations -= 1;
      if (packet.status.code === 0) {
        self.send(
          EIPPacket.UnregisterSessionRequest(packet.sessionHandle, self._context),
          null,
          true,
        );
      }
      return;
    }

    if (self._connectionState !== SessionStates.Connecting) {
      return;
    }

    if (packet.status.code === 0) {
      setConnectionState(self, SessionStates.Connected);
      self._sessionHandle = packet.sessionHandle;
      flushConnectCallbacks(self);
      self.sendNextMessage();
      sendUserRequests(self);
    } else {
      /** the device refused the session: fail every waiting caller
       * instead of leaving them, and the queued requests, pending */
      self.destroy(new InfoError(
        packet,
        packet.status.description || `EIP RegisterSession error code ${packet.status.code}`,
      ));
    }
  });

  /** This should never be called, UnregisterSession has no response */
  self._callbacks.set(CommandCodes.UnregisterSession, () => {
    // console.log('UnregisterSession');
    cleanup(self);
  });

  self._callbacks.set(CommandCodes.SendRRData, (packet) => {
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

    const messageItem = packet.items.find(
      (item) => item.type.code === CPF.ItemTypeIDs.UnconnectedMessage,
    );
    if (messageItem) {
      self.forward(messageItem.data, info, context);
    } else {
      console.log('EIP unhandled SendRRData packet', packet.items);
    }
  });

  self._callbacks.set(CommandCodes.SendUnitData, (packet) => {
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
          connectionID: self._connectedContexts.get(addressItem.address),
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

function removeUserCallback(self, command, callback) {
  const callbacks = self._userCallbacks.get(command);
  if (callbacks) {
    const index = callbacks.indexOf(callback);
    if (index >= 0) {
      callbacks.splice(index, 1);
    }
  }
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
    self._userCallbacks.get(command).push(callback);
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

    super('eip.cip', lowerLayer, null, { ...DefaultOptions, ...options });

    this._sessionHandle = 0;
    this._context = Buffer.alloc(8);
    this._userRequests = [];
    this._connectCallbacks = [];
    this._staleRegistrations = 0;

    this._connectionState = SessionStates.Disconnected;
    setupCallbacks(this);

    this.setDefragger(EIPPacket.IsComplete, EIPPacket.Length);
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
                  if (parts.length === 1) {
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

      const finalizer = (error, reply) => {
        clearTimeout(timeoutHandler);
        /** stop collecting: no later reply may reach this call */
        removeUserCallback(this, CommandCodes.ListIdentity, internalListIdentityReplyHandler); // eslint-disable-line no-use-before-define
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
      };

      timeoutHandler = setTimeout(finalizer, startingTimeout);

      function internalListIdentityReplyHandler(error, reply) {
        if (error) {
          finalizer(error, reply);
        } else if (Array.isArray(reply.items) && reply.items.length === 1) {
          identities.push(reply.items[0]);
          clearTimeout(timeoutHandler);
          if (hostsSpecified && identities.length < hosts.length) {
            timeoutHandler = setTimeout(finalizer, resetTimeout);
            /** keep this callback registered for replies from the remaining hosts */
            return true;
          }
          finalizer();
        } else {
          finalizer('Unexpected result', reply);
        }
        return false;
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

  // TODO: can this use CallbackPromise?
  /** callback(error) is called once the session is registered or has failed */
  connect(callback) {
    if (this._connectionState === SessionStates.Connected) {
      if (callback) callback();
      return;
    }
    /** queue, don't overwrite — a connect while RegisterSession is in
     * flight must not silently drop the earlier caller's callback */
    if (callback) this._connectCallbacks.push(callback);
    if (this._connectionState === SessionStates.Connecting) return;
    setConnectionState(this, SessionStates.Connecting);
    this.send(EIPPacket.RegisterSessionRequest(this._context), null, true);
  }

  disconnect(callback) {
    return CallbackPromise(callback, (resolver) => {
      if (this._connectionState === SessionStates.Connected) {
        this.send(
          EIPPacket.UnregisterSessionRequest(this._sessionHandle, this._context),
          null,
          true,
        );
        this._sessionHandle = 0;
      } else if (this._connectionState === SessionStates.Connecting) {
        /** no handle yet: unregister the session when its reply arrives */
        this._staleRegistrations += 1;
        flushConnectCallbacks(this, new Error('EIP session disconnected before registration completed'));
      }
      setConnectionState(this, SessionStates.Disconnected);
      resolver.resolve();
    });
  }

  sendNextMessage() {
    if (this.hasRequest()) {
      if (this._connectionState === SessionStates.Disconnected) {
        this.connect();
      } else if (this._connectionState === SessionStates.Connected) {
        const request = this.getNextRequest();

        if (request) {
          const { message, info } = request;

          let fullMessage = null;

          if (info && info.connectionID != null) {
            fullMessage = EncodeSendUnitDataMessage(
              this._sessionHandle,
              0,
              0,
              info.connectionID,
              message,
            );

            if (info.connectionID != null && info.responseID != null) {
              this._connectedContexts.set(info.responseID, info.connectionID);
            }
          } else {
            incrementContext(this);
            fullMessage = EncodeSendRRDataMessage(this._sessionHandle, this._context, message);

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

  handleData(data /* , info, context */) {
    // console.log(data);
    const packet = EIPPacket.fromBuffer(data, { current: 0 });
    const { command } = packet;

    if (this._userCallbacks.has(command)) {
      /** user commands carry no request identifier, and replies arrive in
       * request order, so each reply belongs to the oldest waiting caller.
       * That caller stays first in line while it returns true. */
      const callbacks = this._userCallbacks.get(command);
      const callback = callbacks[0];
      if (callback == null) {
        console.log('EIP Error: Unexpected reply, no request waiting:', packet);
        return;
      }

      const error = packet.status.code !== 0 ? packet.status.description || `EIP error code ${packet.status.code}` : null;

      if (callback(error, packet) !== true) {
        removeUserCallback(this, command, callback);
      }
    } else if (this._callbacks.has(command)) {
      this._callbacks.get(command)(packet);
    } else {
      console.log('EIP Error: Unhandled packet:');
      console.log(packet);
      console.log(this._callbacks);
      console.log(data);
    }
  }

  handleDestroy(error) {
    const userCallbacks = [...this._userCallbacks.values()].flat();
    this._userCallbacks.clear();
    /** their callbacks are failed below, so never send them later */
    this._userRequests.length = 0;
    userCallbacks.forEach((cb) => cb(error || 'EIP layer destroyed'));
    flushConnectCallbacks(this, error || new Error('EIP layer destroyed'));
    cleanup(this);
  }
}
