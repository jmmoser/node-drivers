'use strict';

const Layer = require('./../../Stack/Layers/Layer');
const ConnectionManager = require('./ConnectionManager');
const MessageRouter = require('./MessageRouter');

const FORWARD_OPEN_SERVICE = ConnectionManager.Services.ForwardOpen;
const FORWARD_CLOSE_SERVICE = ConnectionManager.Services.ForwardClose;
// const FORWARD_OPEN_SERVICE = ConnectionManager.Services.ForwardOpen | (1 << 7);
// const FORWARD_CLOSE_SERVICE = ConnectionManager.Services.ForwardClose | (1 << 7);

class Connection extends Layer {
  constructor(lowerLayer, options) {
    super(lowerLayer);

    mergeOptionsWithDefaults(this, options);

    this._connectionState = 0;
    this._sequenceCount = 0;
    this._sequenceToContext = new Map();
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
    return Layer.CallbackPromise(callback, resolver => {
      if (this._connectionState === 0) {
        return resolver.resolve();
      }

      if (this._connectionState === -1) {
        return;
      }

      this._disconnectCallback = () => {
        resolver.resolve();
      };

      this._disconnectTimeout = setTimeout(() => {
        this._disconnectCallback();
      }, 10000);

      this._connectionState = -1;
      this.send(ConnectionManager.ForwardClose(this), null, false);
    });
  }

  sendNextMessage() {
    if (this._connectionState === 0) {
      const peek = this.getNextRequest(true);
      if (peek && peek.info) {
        if (peek.info.connected === true) {
          this.connect();
        } else {
          const request = this.getNextRequest();
          this.send(request.message, null, false, this.layerContext(request.layer));
          setImmediate(() => this.sendNextMessage());
        }
      }
    } else if (this._connectionState === 2) {
      const request = this.getNextRequest();

      if (request) {
        if (request.context == null) {
          throw new Error('CIP Connection Error: Connected messages must include a context');
        }

        const sequenceCount = incrementSequenceCount(this);
        this._sequenceToContext.set(sequenceCount, request.context);

        const message = request.message;

        const buffer = Buffer.alloc(message.length + 2);
        buffer.writeUInt16LE(sequenceCount, 0);
        message.copy(buffer, 2);

        this.send(buffer, this.sendInfo, false, this.layerContext(request.layer));

        startResend(this, Buffer.from(buffer));

        setImmediate(() => this.sendNextMessage());
      }
    }
  }

  handleData(data, info, context) {
    const message = MessageRouter.Reply(data);

    switch (message.service.code) {
      case FORWARD_OPEN_SERVICE:
        handleForwardOpen(this, message, info, context);
        break;
      case FORWARD_CLOSE_SERVICE:
        handleForwardClose(this, message, info, context);
        break;
      default:
        handleMessage(this, data, info, context);
    }
  }

  handleDestroy(error) {
    this._sequenceToContext.clear();
  }
}

module.exports = Connection;


function mergeOptionsWithDefaults(self, options) {
  if (!options) options = {};
  self.VendorID = options.VendorID || 0x1339;
  self.OriginatorSerialNumber = options.OriginatorSerialNumber || 42;
  self.ConnectionTimeoutMultiplier = options.ConnectionTimeoutMultiplier || 0x01;
  self.OtoTRPI = options.OtoTRPI || 0x00201234;
  self.OtoTNetworkConnectionParameters = options.OtoTNetworkConnectionParameters || 0x43F4;
  self.TtoORPI = options.TtoORPI || 0x00204001;
  self.TtoONetworkConnectionParameters = options.TtoONetworkConnectionParameters || 0x43F4;
  self.TransportClassTrigger = options.TransportClassTrigger || 0xA3 // 0xA3: Direction = Server, Production Trigger = Application Object, Trasport Class = 3
  self.ProcessorSlot = options.ProcessorSlot || 0;
}

function handleForwardOpen(self, message, info, context) {
  if (self._connectionState === 1) {
    if (message.status.code === 0) {
      self._connectionState = 2;
      // console.log('CIP CONNECTED!');
      const reply = ConnectionManager.ForwardOpenReply(message.data);
      self._OtoTConnectionID = reply.OtoTNetworkConnectionID;
      self._TtoOConnectionID = reply.TtoONetworkConnectionID;
      self._OtoTPacketRate = reply.OtoTActualPacketRate;
      self._TtoOPacketRate = reply.TtoOActualPacketRate;
      self._connectionSerialNumber = reply.ConnectionSerialNumber;

      const rpi = self._OtoTPacketRate < self._TtoOPacketRate ? self._OtoTPacketRate : self._TtoOPacketRate;
      self._connectionTimeout = 4 * (rpi / 1e6) * Math.pow(2, self.ConnectionTimeoutMultiplier);

      // EIP specific information
      self.sendInfo = {
        connectionID: self._OtoTConnectionID,
        responseID: self._TtoOConnectionID
      };

      self.sendNextMessage();
    } else {
      self._connectionState = 0;
      console.log('');
      console.log('CIP Connection Error: Status is not successful or service is not correct:');
      console.log(message);
    }
  }

  if (self._connectCallback) self._connectCallback(message);
  self._connectCallback = null;
}

function handleForwardClose(self, message, info, context) {
  stopResend(self);
  if (message.status.code === 0) {
    const reply = ConnectionManager.ForwardCloseReply(message.data);
    self._connectionState = 0;
    // console.log('CIP CLOSED!');
    if (self._disconnectCallback) {
      self._disconnectCallback(reply);
      clearTimeout(self._disconnectTimeout);
      self._disconnectCallback = null;
    }
  }
}

function handleMessage(self, data, info, context) {
  /** call layerForContext here just to make sure it is cleared from the underlying Map */
  const layer = self.layerForContext(context);

  if (self._connectionState === 2) {
    const sequenceCount = data.readUInt16LE(0);

    if (self._sequenceToContext.has(sequenceCount) === false) {
      /* This happens when the last message is resent to prevent CIP connection timeout disconnect */
      return;
    }

    context = self._sequenceToContext.get(sequenceCount);
    self._sequenceToContext.delete(sequenceCount);
    data = data.slice(2);

    // console.log({
    //   context,
    //   data,
    //   sequenceCount
    // });
  }

  if (layer) {
    self.forwardTo(layer, data, info, context);
  } else {
    /* this should never happen */
    self.forward(data, info, context);
  }
}


function incrementSequenceCount(self) {
  self._sequenceCount = (self._sequenceCount + 1) % 0x10000;
  return self._sequenceCount;
}

function startResend(self, lastMessage) {
  stopResend(self);

  self.__resendInterval = setInterval(function () {
    self.send(lastMessage, self.sendInfo, false, null);
  }, Math.floor(self._connectionTimeout * 3 / 4) * 1000);
}

function stopResend(self) {
  if (self.__resendInterval != null) {
    clearInterval(self.__resendInterval);
    self.__resendInterval = null;
  }
}


// Connection.Code = 0x05;

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
