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
  let offset = 0;
  const buffer = Buffer.alloc(data.length + 10);
  buffer.writeUInt16LE(2, offset); offset += 2; // One address item and one data item

  buffer.writeUInt16LE(EIPPacket.CPFItemIDs.NullAddress, offset); offset += 2; // AddressTypeID = 0 to indicate a UCMM message
  buffer.writeUInt16LE(0, offset); offset += 2; // AddressLength = 0 since UCMM messages use the NULL address item

  buffer.writeUInt16LE(EIPPacket.CPFItemIDs.UnconnectedMessage, offset); offset += 2; // DataTypeID = 0x00B2 to encapsulate the UCMM
  buffer.writeUInt16LE(data.length, offset); offset += 2;
  data.copy(buffer, offset);

  return buffer;
}

function CPF_Connected_Packet(connectionIdentifier, data) {
  let offset = 0;
  const buffer = Buffer.alloc(data.length + 14);
  buffer.writeUInt16LE(2, offset); offset += 2;

  buffer.writeUInt16LE(EIPPacket.CPFItemIDs.ConnectionBased, offset); offset += 2;
  buffer.writeUInt16LE(4, offset); offset += 2;
  buffer.writeUInt32LE(connectionIdentifier, offset); offset += 4;

  buffer.writeUInt16LE(EIPPacket.CPFItemIDs.ConnectedMessage, offset); offset += 2;
  buffer.writeUInt16LE(data.length, offset); offset += 2;
  data.copy(buffer, offset);

  return buffer;
}

function SendRRDataRequest(sessionHandle, senderContext, data) {
  // INTERFACE HANDLE SHOULD BE 0 FOR ENCAPSULATING CIP PACKETS
  const packet = new EIPPacket();
  packet.Command = EIPCommands.SendRRData;
  packet.SessionHandle = sessionHandle;
  packet.SenderContext = senderContext;
  packet.setData(SendData_Packet(0, 0, CPF_UCMM_Packet(data)));
  return packet.toBuffer();
}

function SendUnitDataRequest(sessionHandle, interfaceHandle, timeout, connectionIdentifier, data) {
  const packet = new EIPPacket();
  packet.Command = EIPCommands.SendUnitData;
  packet.SessionHandle = sessionHandle;
  packet.setData(SendData_Packet(interfaceHandle, timeout, CPF_Connected_Packet(connectionIdentifier, data)));
  return packet.toBuffer();
}


class EIPLayer extends Layer {
  constructor(lowerLayer) {
    super(lowerLayer);

    this._dataLength = 0;
    this._data = Buffer.alloc(0);

    this._connectionState = 0;

    this.setDefragger(EIPPacket.IsComplete, EIPPacket.Length);

    this._setupContext();

    this._setupCallbacks();

    this.connect();
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

  // disconnect(callback) {
  //   if (this._connectionState === 0) {
  //     if (callback) callback();
  //     return;
  //   }

  //   this._connectStatus = 0;
  //   this.send(EIPPacket.UnregisterSessionRequest(this._sessionHandle, this._context), null, true);
  //   if (callback) callback();
  // }

  sendNextMessage() {
    if (this._connectionState === 2) {
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

  handleData(data, info, context) {
    const command = EIPPacket.Command(data);
    const packet = EIPPacket.fromBuffer(data);

    let callback = null;
    if (this._userCallbacks[command]) {
      callback = this._userCallbacks[command];
    } else if (this._callbacks[command]) {
      callback = this._callbacks[command];
    }

    if (callback) {
      callback.apply(this, [packet]);
      return;
    }

    console.log('EIP Error: Unhandled packet:');
    console.log(packet);
  }


  _setupCallbacks() {
    const self = this;

    this._callbacks = {};
    this._userCallbacks = {};
    this._unconnectedContexts = {};
    this._connectedContexts = {};

    this._callbacks[EIPCommands.RegisterSession] = function(packet) {
      // console.log('RegisterSession');
      if (packet.status.code === 0) {
        this._connectionState = 2;
        this._sessionHandle = packet.SessionHandle;
        if (this._connectCallback) this._connectCallback();
        this.sendNextMessage();
      } else {
        this._connectionState = 0;
      }
    };

    this._callbacks[EIPCommands.UnregisterSession] = function(packet) {
      // console.log('UnregisterSession');
      this._connectionState = 0;
      this._sessionHandle = null;

      this.connect();
    };

    // this._callbacks[EIPCommands.SendRRData] = function(packet) {
    //   // console.log('SendRRData');
    //   let info = { connected: false };
    //   let senderContext = packet.SenderContext.toString('hex');
    //   if (this._unconnectedContexts[senderContext]) {
    //     info.context = this._unconnectedContexts[senderContext];
    //     delete this._unconnectedContexts[senderContext];
    //   } else {
    //     console.log('EIPLayer Error: no Sender Context available:');
    //     console.log(packet);
    //     console.log(senderContext);
    //     console.log(this._unconnectedContexts);
    //   }
    //
    //   self.forward(packet.Items[1].data, info);
    // };

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


  NOP(callback) {
    // no response so callback will never be called
    this._sendUserRequest(EIPCommands.NOP, EIPPacket.NOPRequest(), callback);
  }

  ListServices(callback) {
    this._sendUserRequest(EIPCommands.ListServices, EIPPacket.ListServicesRequest(this._context), callback);
  }

  ListIdentity(callback) {
    this._sendUserRequest(EIPCommands.ListIndentity, EIPPacket.ListIndentityRequest(), callback);
  }

  ListInterfaces(callback) {
    this._sendUserRequest(EIPCommands.ListInterfaces, EIPPacket.ListInterfacesRequest(), callback);
  }

  _sendUserRequest(command, buffer, callback) {
    this._incrementContext();
    this._userCallbacks[command] = callback;
    if (!callback) return;

    this.send(buffer, null, false);
  }
}

// function printBuffer(buffer) {
//   console.log('');
//   console.log('********');
//   let i = 0;
//   while (i < buffer.length) {
//     console.log(buffer.slice(i, i + 8));
//     i += 8;
//   }
//   console.log('********');
// }

module.exports = EIPLayer;
