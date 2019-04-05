'use strict';

const Layer = require('./Layer');
const EIPPacket = require('../Packets/EIPPacket');
const EIPCommands = EIPPacket.Commands;


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

  buffer.writeUInt16LE(EIPPacket.CPFItemIDs.NullAddress, 2); // AddressTypeID = 0 to indicate a UCMM message
  buffer.writeUInt16LE(0, 4); // AddressLength = 0 since UCMM messages use the NULL address item

  buffer.writeUInt16LE(EIPPacket.CPFItemIDs.UnconnectedMessage, 6); // DataTypeID = 0x00B2 to encapsulate the UCMM
  buffer.writeUInt16LE(data.length, 8);
  data.copy(buffer, 10);

  return buffer;
}

function CPF_Connected_Packet(connectionIdentifier, data) {
  const buffer = Buffer.alloc(14 + data.length);
  buffer.writeUInt16LE(2, 0);
  buffer.writeUInt16LE(EIPPacket.CPFItemIDs.ConnectionBased, 2);
  buffer.writeUInt16LE(4, 4);
  buffer.writeUInt32LE(connectionIdentifier, 6);
  buffer.writeUInt16LE(EIPPacket.CPFItemIDs.ConnectedMessage, 10);
  buffer.writeUInt16LE(data.length, 12);
  data.copy(buffer, 14);
  return buffer;
}


function SendRRDataRequest(sessionHandle, senderContext, data) {
  // INTERFACE HANDLE SHOULD BE 0 FOR ENCAPSULATING CIP PACKETS
  const packet = new EIPPacket();
  packet.Command = EIPCommands.SendRRData;
  packet.SessionHandle = sessionHandle;
  packet.SenderContext = senderContext;
  packet.Data = SendData_Packet(0, 0, CPF_UCMM_Packet(data));
  return packet.toBuffer();
}

function SendUnitDataRequest(sessionHandle, interfaceHandle, timeout, connectionIdentifier, data) {
  const packet = new EIPPacket();
  packet.Command = EIPCommands.SendUnitData;
  packet.SessionHandle = sessionHandle;
  packet.Data = SendData_Packet(interfaceHandle, timeout, CPF_Connected_Packet(connectionIdentifier, data));
  return packet.toBuffer();
}


class EIPLayer extends Layer {
  constructor(lowerLayer) {
    super(lowerLayer);

    this._sessionHandle = 0;
    this._connectionState = 0;

    this.setDefragger(EIPPacket.IsComplete, EIPPacket.Length);

    this._setupContext();
    this._setupCallbacks();
    this._userRequests = [];
  }

  _setupContext() {
    this._context = Buffer.alloc(8);
  }

  _incrementContext() {
    for (let i = 0; i < 8; i++) {
      this._context[i] = (this._context[i] + 1) % 0x100;
      if (this._context[i] !== 0) break;
    }
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

          // if (info.connected === true) {
          if (info.connectionID != null) {
            fullMessage = SendUnitDataRequest(this._sessionHandle, 0, 0, info.connectionID, message);
            if (request.context != null && info.responseID != null) {
              this._connectedContexts[info.responseID] = request.context;
            }
          } else {
            this._incrementContext();
            fullMessage = SendRRDataRequest(this._sessionHandle, this._context, message);

            // if (info.context) this._unconnectedContexts[this._context.toString('hex')] = info.context;

            if (request.context != null) {
              this._unconnectedContexts[this._context.toString('hex')] = request.context;
            }
          }

          this.send(fullMessage, null, false);

          this.sendNextMessage();
        }
      }
    }
  }

  handleData(data, info, context) {
    const command = EIPPacket.Command(data);
    const packet = EIPPacket.fromBuffer(data);

    if (this._userCallbacks.has(command)) {
      const callbacks = this._userCallbacks.get(command);
      this._userCallbacks.delete(command);
      callbacks.forEach(callback => {
        callback.apply(this, [packet]);
      });
    } else if (this._callbacks[command]) {
      this._callbacks[command].apply(this, [packet]);
    } else {
      console.log('EIP Error: Unhandled packet:');
      console.log(packet);
      console.log(this._callbacks);
      console.log(data)
    }
  }

  // handleData(data, info, context) {
  //   const command = EIPPacket.Command(data);
  //   const packet = EIPPacket.fromBuffer(data);

  //   let callback = null;
  //   if (this._userCallbacks[command]) {
  //     callback = this._userCallbacks[command];
  //   } else if (this._callbacks[command]) {
  //     callback = this._callbacks[command];
  //   }

  //   if (callback) {
  //     callback.apply(this, [packet]);
  //     return;
  //   }

  //   console.log('EIP Error: Unhandled packet:');
  //   console.log(packet);
  //   console.log(this._callbacks);
  //   console.log(data)
  // }


  _setupCallbacks() {
    const self = this;

    this._callbacks = {};
    this._userCallbacks = new Map();
    this._unconnectedContexts = {};
    this._connectedContexts = {};

    this._callbacks[EIPCommands.RegisterSession] = function(packet) {
      // console.log('RegisterSession');
      // console.log(packet);
      if (packet.status.code === 0) {
        this._connectionState = 2;
        this._sessionHandle = packet.SessionHandle;
        if (this._connectCallback) this._connectCallback();
        this.sendNextMessage();
        // this._sendUserRequests();
        sendUserRequests(this);
      } else {
        this._connectionState = 0;
      }
    };

    this._callbacks[EIPCommands.UnregisterSession] = function(packet) {
      // console.log('UnregisterSession');
      this._connectionState = 0;
      this._sessionHandle = 0;
    };

    this._callbacks[EIPCommands.SendRRData] = function(packet) {
      // console.log('SendRRData');
      
      const info = { connected: false };
      const senderContext = packet.SenderContext.toString('hex');
      let context = null; // context can be null if only one upper layer
      if (this._unconnectedContexts[senderContext]) {
        context = this._unconnectedContexts[senderContext];
        delete this._unconnectedContexts[senderContext];
      }
      // else {
      //   console.log('EIPLayer Error: no Sender Context available:');
      //   console.log(packet);
      //   console.log(senderContext);
      //   console.log(this._unconnectedContexts);
      // }

      self.forward(packet.Items[1].data, info, context);
    };

    this._callbacks[EIPCommands.SendUnitData] = function(packet) {
      // console.log('SendUnitData');
      if (packet.status.code === 0) {
        const info = {
          connected: true,
          connectionID: packet.Items[0].address
        };
        const context = this._connectedContexts[info.connectionID];
        // console.log(packet);
        // console.log(this._connectedContexts);
        // console.log(info.connectionID);
        // console.log(context);

        self.forward(packet.Items[1].data, info, context);
      } else {
        console.log('EIPLayer Error: Packet Status:');
        console.log(packet);
      }
    }
  }


  nop(callback) {
    // no response, used to test underlying transport layer
    return Layer.CallbackPromise(callback, resolver => {
      queueUserRequest(this, EIPPacket.NOPRequest());
      resolver.resolve();
    });
  }

  listServices(callback) {
    return Layer.CallbackPromise(callback, resolver => {
      queueUserRequest(this, EIPPacket.ListServicesRequest(this._context), function(reply) {
        if (reply.status.code !== 0) {
          resolver.reject(reply.status.description, reply);
        } else {
          if (Array.isArray(reply.Items)) {
            resolver.resolve(reply.Items);
          } else {
            resolver.reject('Unexpected result', reply);
          }
        }
      });
    });
  }

  listIdentity(callback) {
    return Layer.CallbackPromise(callback, resolver => {
      queueUserRequest(this, EIPPacket.ListIdentityRequest(), function(reply) {
        if (reply.status.code !== 0) {
          resolver.reject(reply.status.description, reply);
        } else {
          if (Array.isArray(reply.Items) && reply.Items.length === 1) {
            resolver.resolve(reply.Items[0]);
          } else {
            resolver.reject('Unexpected result', reply);
          }
        }
      });
    });
  }

  listInterfaces(callback) {
    return Layer.CallbackPromise(callback, resolver => {
      queueUserRequest(this, EIPPacket.ListInterfacesRequest(), function (reply) {
        if (reply.status.code !== 0) {
          resolver.reject(reply.status.description, reply);
        } else {
          if (Array.isArray(reply.Items)) {
            resolver.resolve(reply.Items);
          } else {
            resolver.reject('Unexpected result', reply);
          }
        }
      });
    });
  }
}

module.exports = EIPLayer;


function queueUserRequest(self, buffer, callback) {
  const command = EIPPacket.Command(buffer);

  if (callback) {
    /* no callback for NOP */
    if (!self._userCallbacks.has(command)) {
      self._userCallbacks.set(command, []);
    }
    self._userCallbacks.get(command).push(callback);
  }

  self._userRequests.push(buffer);
  sendUserRequests(self);
}


function sendUserRequests(self) {
  if (self._connectionState === 0 || self._connectionState === 2) {
    let buffer;
    while ((buffer = self._userRequests.shift())) {
      /* overwrite sessionHandle, CIP Vol 2 says it is ignored for some commands but I don't believe it is ignored if a session is established */
      buffer.writeUInt32LE(self._sessionHandle, 4);
      self.send(buffer, null, false);
    }
  }
}