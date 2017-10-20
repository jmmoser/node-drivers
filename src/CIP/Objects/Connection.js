'use strict';

const Layer = require('./../../Stack/Layers/Layer');

const ConnectionManager = require('./ConnectionManager');
const MessageRouter = require('./MessageRouter');

class Connection extends Layer {
  constructor(lowerLayer, options) {
    super(lowerLayer);

    this.mergeOptionsWithDefaults(options);

    this._connectionState = 0;
    this._disconnectState = 0;

    this._sequenceCount = 0;

    this._sequenceToContext = new Map();

    this.connect();
  }

  mergeOptionsWithDefaults(options) {
    if (!options) options = {};
    this.VendorID = options.VendorID || 0x1339;
    this.OriginatorSerialNumber = options.OriginatorSerialNumber || 42;
    this.ConnectionTimeoutMultiplier = options.ConnectionTimeoutMultiplier || 0x01;
    this.OtoTRPI = options.OtoTRPI || 0x00201234;
    this.OtoTNetworkConnectionParameters = options.OtoTNetworkConnectionParameters || 0x43F4;
    this.TtoORPI = options.TtoORPI || 0x00204001;
    this.TtoONetworkConnectionParameters = options.TtoONetworkConnectionParameters || 0x43F4;
    this.TransportClassTrigger = options.TransportClassTrigger || 0xA3 // 0xA3: Direction = Server, Production Trigger = Application Object, Trasport Class = 3
    this.ProcessorSlot = options.ProcessorSlot || 0;
  }

  connect(callback) {
    this._connectCallback = callback;
    if (this._connectionState === 1) return;
    if (this._connectionState === 2 && callback != null) {
      if (callback != null) {
        callback();
      }
      return;
    }

    this._connectionState = 1;
    this.send(ConnectionManager.ForwardOpen(this), null, false);
  }

  disconnect(callback) {
    this._disconnectCallback = callback;
    if (this._disconnecting === 1) return;
    if (this._connectionState === 0) {
      if (callback != null) {
        callback();
      }
      return;
    }

    this._disconnectState = 1;
    this.send(ConnectionManager.ForwardClose(this), null, false);
  }

  sendNextMessage() {
    if (this._connectionState === 2) {
      let request = this.getNextRequest();

      if (request) {
        if (request.context == null) {
          throw new Error('CIP Connection Error: Connected messages must include a context');
        }

        let sequenceCount = this._incrementSequenceCount();
        this._sequenceToContext.set(sequenceCount, request.context);

        let message = request.message;

        let buffer = Buffer.alloc(message.length + 2);
        buffer.writeUInt16LE(sequenceCount, 0);
        message.copy(buffer, 2);

        this.send(buffer, this.sendInfo, false, this.layerContext(request.layer));

        this._lastMessage = Buffer.from(buffer);

        this.sendNextMessage();
      }
    }
  }

  handleData(data, info, context) {
    const FORWARD_OPEN_SERVICE = ConnectionManager.Services.ForwardOpen | (1 << 7);
    const FORWARD_CLOSE_SERVICE = ConnectionManager.Services.ForwardClose | (1 << 7);

    let message = MessageRouter.Reply(data);

    switch (message.service) {
      case FORWARD_OPEN_SERVICE:
        this.handleForwardOpen(message, info, context);
        break;
      case FORWARD_CLOSE_SERVICE:
        this.handleForwardClose(message, info, context);
        break;
      default:
        this.handleConnectedMessage(data, info, context);
    }
  }

  handleForwardOpen(message, info, context) {
    if (message.status.code === 0) {
      this._connectionState = 2;
      let reply = ConnectionManager.ForwardOpenReply(message.data);
      this._OtoTConnectionID = reply.OtoTNetworkConnectionID;
      this._TtoOConnectionID = reply.TtoONetworkConnectionID;
      this._OtoTPacketRate = reply.OtoTActualPacketRate;
      this._TtoOPacketRate = reply.TtoOActualPacketRate;
      this._connectionSerialNumber = reply.ConnectionSerialNumber;

      let rpi = this._OtoTPacketRate < this._TtoOPacketRate ? this._OtoTPacketRate : this._TtoOPacketRate;
      rpi = 4 * (rpi / 1e6) * Math.pow(2, this.ConnectionTimeoutMultiplier);
      this._rpi = rpi;

      // EIP specific information
      this.sendInfo = {
        connectionID: this._OtoTConnectionID,
        responseID: this._TtoOConnectionID
      };

      this.sendNextMessage();
    } else {
      console.log('');
      console.log('CIP Connection Error: Status is not successful or service is not correct:');
      console.log(message);
    }

    if (this._connectCallback) this._connectCallback(message);
    this._connectCallback = null;
  }

  handleForwardClose(message, info, context) {
    if (message.status.code === 0) {
      let reply = ConnectionManager.ForwardCloseReply(message.data);
      this._connectionState = 0;
      this._disconnectState = 0;
      if (this._disconnectCallback) this._disconnectCallback(reply);
      this._disconnectCallback = null;
    }
  }

  handleConnectedMessage(data, info, context) {
    let sequenceCount = data.readUInt16LE(0);

    if (this._sequenceToContext.has(sequenceCount) === false) {
      // This happens when the last message is resent to prevent disconnect
      return;
    }

    context = this._sequenceToContext.get(sequenceCount);
    this._sequenceToContext.delete(sequenceCount);
    this.forward(data.slice(2), info, context);
  }

  _incrementSequenceCount() {
    this._sequenceCount = (this._sequenceCount + 1) % 0x10000;
    return this._sequenceCount;
  }
}

module.exports = Connection;

Connection.Code = 0x05;

// CIP Vol1 Table 3-4.2
const ClassServices = {
  Create: 0x08,
  Delete: 0x09,
  Reset: 0x05,
  FindNextObjectInstance: 0x11,
  GetAttributeSingle: 0x0E,

  ConnectionBind: 0x4B,
  ProducingApplicationLookup: 0x4C,
  SafetyClose: 0x4E,
  SafetyOpen: 0x54
};

// CIP Vol1 Table 3-4.9
const InstanceAttributes = {
  1: {
    name: 'State',
    type: 'USINT'
  },
  2: {
    name: 'Instance_type',
    type: 'USINT'
  },
  3: {
    name: 'TransportClass_trigger',
    type: 'BYTE'
  },
  4: {
    name: 'DeviceNet_produced_conection_id',
    type: 'UINT'
  },
  5: {
    name: 'DeviceNet_consumed_connection_id',
    type: 'UINT'
  },
  6: {
    name: 'DeviceNet_initial_comm_characteristics',
    type: 'BYTE'
  },
  7: {
    name: 'Produced_connection_size',
    type: 'UINT'
  },
  8: {
    name: 'Consumed_connection_size',
    type: 'UINT'
  },
  9: {
    name: 'Expected_packet_rate',
    type: 'UINT'
  },
  10: {
    name: 'CIP_produced_connection_id',
    type: 'UDINT'
  },
  11: {
    name: 'CIP_consumed_connection_id',
    type: 'UDINT'
  },
  12: {
    name: 'Watchdog_timeout_action',
    type: 'USINT'
  },
  13: {
    name: 'Produced_connection_path_length',
    type: 'UINT'
  },
  14: {
    name: 'Produced_connection_path',
    type: 'EPATH'
  },
  15: {
    name: 'Consumed_connection_path_length',
    type: 'UINT'
  },
  16: {
    name: 'Consumed_connection_path',
    type: 'EPATH'
  },
  17: {
    name: 'Production_inhibit_time',
    type: 'UINT'
  },
  18: {
    name: 'Connection_timeout_multiplier',
    type: 'USINT'
  },
  19: {
    name: 'Connection_binding_list',
    type: 'UINT[]'
  }
}

// CIP Vol1 Table 3-4.10
const StateAttributes = {
  0: 'Non-existent',
  1: 'Configuring',
  2: 'Waiting for connection ID',
  3: 'Established',
  4: 'Timed out',
  5: 'Deferred delete',
  6: 'Closing'
};

// CIP Vol1 Table 3-4.11
const InstanceTypeAttributes = {
  0: 'Explicit messaging',
  1: 'I/O',
  2: 'CIP bridged'
};

// CIP Vol1 Table 3-4.5
const ConnectionBindServiceStatusCodeDescriptions = {
  0x02: {
    0x01: 'One or both of the connection instances is Non-existent',
    0x02: 'The connection class and/or instance is out of resources to bind instances'
  },
  0x0C: {
    0x01: 'Both of the connection instances are existent, but at least one is not in the established state'
  },
  0x20: {
    0x01: 'Both connection instances are the same value'
  },
  0xD0: {
    0x01: 'One or both of the connection instances is not a dynamically created I/O connection',
    0x02: 'One or both of the connection instances were created internally and the device is not allowing a binding to it'
  }
};
