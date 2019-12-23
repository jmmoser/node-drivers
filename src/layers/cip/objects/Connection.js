'use strict';

const { CallbackPromise, InvertKeyValues } = require('../../../utils');
const { DataType, CommonServices, Classes, Encode } = require('./CIP');
const EPath = require('./EPath');
const Layer = require('./../../Layer');
const ConnectionManager = require('./ConnectionManager');
const MessageRouter = require('./MessageRouter');

const FORWARD_OPEN_SERVICE = ConnectionManager.ServiceCodes.ForwardOpen;
const LARGE_FORWARD_OPEN_SERVICE = ConnectionManager.ServiceCodes.LargeForwardOpen;
const FORWARD_CLOSE_SERVICE = ConnectionManager.ServiceCodes.ForwardClose;
// // const FORWARD_OPEN_SERVICE = ConnectionManager.ServiceCodes.ForwardOpen | (1 << 7);
// // const FORWARD_CLOSE_SERVICE = ConnectionManager.ServiceCodes.ForwardClose | (1 << 7);

const MaximumLargeConnectionSize = 0xFFFF;
const MaximumNormalConnectionSize = 0b111111111; /** 511 */

const ConnectionManagerContextType = 'ConnectionManager';
function createConnectionManagerContext(request) {
  return {
    type: ConnectionManagerContextType,
    request
  };
}

const TypeCodes = Object.freeze({
  Null: 0,
  Multicast: 1,
  PointToPoint: 2
});

const PriorityCodes = Object.freeze({
  Low: 0,
  High: 1,
  Scheduled: 2,
  Urgent: 3
});

const SizeTypeCodes = Object.freeze({
  Fixed: 0,
  Variable: 1
});


class Connection extends Layer {
  constructor(lowerLayer, options) {
    super('cip.connection', lowerLayer);

    mergeOptionsWithDefaults(this, options);

    this._connectionState = 0;
    this._sequenceCount = 0;
    this._sequenceToContext = new Map();

    this.connect();
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

    const request = ConnectionManager.ForwardOpenRequest(this, true);
    this.send(request, null, false, createConnectionManagerContext(request));
  }

  
  async readAttributes() {
    if (this._connectionState === 0) {
      // return {};
      this.connect();
    }

    if (this._connectionState !== 2) {
      return;
    }

    const attributes = [
      InstanceAttributeCodes.State,
      // InstanceAttributeCodes.Type,
      // InstanceAttributeCodes.TransportClassTrigger,
      // InstanceAttributeCodes.ProducedConnectionSize,
      // InstanceAttributeCodes.ConsumedConnectionSize,
      // InstanceAttributeCodes.ExpectedPacketRate,
      // InstanceAttributeCodes.WatchdogTimeoutAction,
      // InstanceAttributeCodes.ProducedConnectionPathLength,
      // InstanceAttributeCodes.ProducedConnectionPath,
      // InstanceAttributeCodes.ConsumedConnectionPathLength,
      // InstanceAttributeCodes.ConsumedConnectionPath
    ];

    // const service = CommonServices.GetAttributeList;

    // const data = Encode(DataType.STRUCT([
    //   DataType.UINT,
    //   DataType.ARRAY(DataType.UINT, 0, attributes.length - 1)
    // ]), [
    //   attributes.length,
    //   attributes
    // ]);
    // console.log(data);

    for (let i = 0; i < attributes.length; i++) {
      const attribute = attributes[i];

      const service = CommonServices.GetAttributeSingle;

      const path = EPath.EncodeSegments(true, [
        new EPath.Segments.Logical.ClassID(Classes.Connection),
        new EPath.Segments.Logical.InstanceID(this._OtoTConnectionID),
        // new EPath.Segments.Logical.InstanceID(this._TtoOConnectionID),
        // new EPath.Segments.Logical.AttributeID(attribute)
      ]);
      // const path = Buffer.from([]);
      const data = Encode(DataType.USINT, attribute);
      // const data = null;
      const request = MessageRouter.Request(service, path, data);

      await new Promise(resolve => {
        sendConnected(this, this, request, this.contextCallback(function(err, res) {
          if (res && res.service.code !== service) {
            console.log('!@#$!@#$^123984123$!@#$!@#$(*!@#$& INCORRECT SERVICE');
          }
          if (err) {
            console.log(err);
          } else {
            console.log(res);
          }
          resolve();
        }));
      });
    }
  }


  disconnect(callback) {
    return CallbackPromise(callback, resolver => {
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

      const request = ConnectionManager.ForwardCloseRequest(this);
      this.send(request, null, false, createConnectionManagerContext(request));
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

        sendConnected(this, request.layer, request.message, request.context);
        setImmediate(() => this.sendNextMessage());
      }
    }
  }


  handleData(data, info, context) {
    // totalData += data.length;
    // totalPackets += 1;
    // console.log(`${totalPackets}: ${totalData}`);

    const message = MessageRouter.Reply(data);

    if (context != null && context.type === ConnectionManagerContextType) {
      message.request = context.request;
      ConnectionManager.TranslateResponse(message);
    }

    switch (message.service.code) {
      case FORWARD_OPEN_SERVICE:
      case LARGE_FORWARD_OPEN_SERVICE:
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
    cleanup(this);
  }


  static DecodeInstanceAttribute(attribute, data, offset, cb) {
    const dataType = InstanceAttributeDataTypes[attribute];
    if (!dataType) {
      throw new Error(`Unknown instance attribute: ${attribute}`);
    }

    let value;
    offset = Decode(dataType, data, offset, val => value = val);

    switch (attribute) {
      case InstanceAttributeCodes.State: {
        value = {
          code: value,
          name: InstanceStateNames[value] || 'Unknown'
        };
        break;
      }
      case InstanceAttributeCodes.Type: {
        value = {
          code: value,
          name: InstanceTypeNames[value] || 'Unkown'
        }
      }
      default:
        break;
    }

    if (typeof cb === 'function') {
      cb({
        code: attribute,
        name: InstanceAttributeNames[attribute] || 'Unknown',
        value
      });
    }

    return offset;
  }
}

module.exports = Connection;


function sendConnected(connection, layer, message, context) {
  const sequenceCount = incrementSequenceCount(connection);
  connection._sequenceToContext.set(sequenceCount, context);
  connection.layerContext(layer, sequenceCount);

  const buffer = Buffer.allocUnsafe(message.length + 2);
  buffer.writeUInt16LE(sequenceCount, 0);
  message.copy(buffer, 2);

  connection.send(buffer, connection.sendInfo, false);

  startResend(connection, buffer);
}


function cleanup(layer) {
  layer._connectionState === 0;
  layer._sequenceToContext.clear();
}


function buildNetworkConnectionParametersCode(options) {
  let code = 0;
  const large = options.maximumSize > MaximumNormalConnectionSize;

  if (large === true) {
    code |= (options.redundantOwner & 1) << 31;
    code |= (options.type & 3) << 29;
    /** Bit 28 reserved */
    code |= (options.priority & 3) << 26;
    code |= (options.sizeType & 1) << 25;
    /** Bits 16 through 24 reserved */
    code |= (options.maximumSize & MaximumLargeConnectionSize);
  } else {
    code |= (options.redundantOwner & 1) << 15;
    code |= (options.type & 3) << 13;
    /** Bit 12 reserved */
    code |= (options.priority & 3) << 10;
    code |= (options.sizeType & 1) << 9;
    code |= (options.maximumSize & MaximumNormalConnectionSize);
  }
  return code;
}


function mergeOptionsWithDefaults(self, options) {
  if (!options) options = {};

  // self.networkConnectionParameters = options.networkConnectionParameters || {
  //   redundantOwner: 0,
  //   type: TypeCodes.PointToPoint,
  //   priority: PriorityCodes.Low,
  //   sizeType: SizeTypeCodes.Variable,
  //   maximumSize: 500
  // };

  self.networkConnectionParameters = Object.assign({
    redundantOwner: 0,
    type: TypeCodes.PointToPoint,
    priority: PriorityCodes.Low,
    sizeType: SizeTypeCodes.Variable,
    maximumSize: 500
  }, options.networkConnectionParameters);

  // console.log(self.networkConnectionParameters);

  self.large = self.networkConnectionParameters.maximumSize > MaximumNormalConnectionSize;

  self.VendorID = options.VendorID || 0x1339;
  self.OriginatorSerialNumber = options.OriginatorSerialNumber || 42;
  self.ConnectionTimeoutMultiplier = options.ConnectionTimeoutMultiplier || 0x01;
  self.OtoTRPI = options.OtoTRPI || 2000000;
  self.OtoTNetworkConnectionParameters = buildNetworkConnectionParametersCode(self.networkConnectionParameters);
  self.TtoORPI = options.TtoORPI || 2000000;
  self.TtoONetworkConnectionParameters = buildNetworkConnectionParametersCode(self.networkConnectionParameters);
  self.TransportClassTrigger = options.TransportClassTrigger || 0xA3 // 0xA3: Direction = Server, Production Trigger = Application Object, Trasport Class = 3
  self.route = options.route;

  // self.options = Object.assign({
  //   vendorID: 0x1339,
  //   originatorSerialNumber: 42,
  //   connectionTimeoutMultiplier: 0x01,
  //   o2tRequestedPacketInterval: 0x00201234,
  //   o2tNetworkConnectionParameters: 0x43F4,
  //   t2oRequestedPacketInterval: 0x00204001,
  //   t2oNetworkConnectionParameters: 0x43F4,
  //   transportClassTrigger: 0xA3, // 0xA3: Direction = Server, Production Trigger = Application Object, Trasport Class = 3
  //   route: options.route
  // }, options);
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

      // self.readAttributes();

      self.sendNextMessage();
    } else {
      self._connectionState = 0;

      if (message.service.code === LARGE_FORWARD_OPEN_SERVICE && message.status.code === 8) {
        self.networkConnectionParameters.maximumSize = 500;
        self.large = false;
        self.OtoTNetworkConnectionParameters = buildNetworkConnectionParametersCode(self.networkConnectionParameters);
        self.TtoONetworkConnectionParameters = buildNetworkConnectionParametersCode(self.networkConnectionParameters);
        console.log('Large forward open not supported. Attempting normal forward open');
        self.connect();
      } else {
        console.log('CIP Connection Error: Status is not successful or service is not correct:');
        console.log(message);
      }
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
    // console.log('CIP Connection closed');
    if (self._disconnectCallback) {
      self._disconnectCallback(reply);
      clearTimeout(self._disconnectTimeout);
      self._disconnectCallback = null;
    }
  } else {
    console.log('CIP connection unsuccessful close');
    console.log(message);
  }
}



function handleMessage(self, data, info, context) {
  if (self._connectionState === 2) {
    const sequenceCount = data.readUInt16LE(0);

    if (self._sequenceToContext.has(sequenceCount) === false) {
      /* This happens when the last message is resent to prevent CIP connection timeout disconnect */
      return;
    }

    const layer = self.layerForContext(sequenceCount);
    const actualContext = self._sequenceToContext.get(sequenceCount);
    self._sequenceToContext.delete(sequenceCount);
    data = data.slice(2);

    if (layer) {
      if (layer === self) {
        const callback = self.callbackForContext(actualContext);
        if (callback != null) {
          // callback(null, MessageRouter.Reply(data), info);

          const reply = MessageRouter.Reply(data);

          // console.log(reply);
          // console.log('calling callback');

          // if (reply.service.code !== service) {
          //   return callback('Response service does not match request service. This should never happen.', reply);
          // }

          callback(
            reply.status.error ? reply.status.description || 'CIP Error' : null,
            reply
          );

        } else {
          console.log('CIP.Connection: Unhandled data received.', data);
        }
      } else {
        // console.log(`FORWARDING: ${layer.name}`, data);
        self.forwardTo(layer, data, info, actualContext);
      }
    } else {
      // /** This should never happen */
      console.log('THIS SHOULD NOT HAPPEN');
      self.forward(data, info, actualContext);
    }
  } else {
    console.log('CIP Connection not connected, unhandled message: ', data);
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


// CIP Vol1 Table 3-4.2
const ClassServices = {
  /** Common */
  Create: CommonServices.Create,
  Delete: CommonServices.Delete,
  Reset: CommonServices.Reset,
  FindNextObjectInstance: CommonServices.FindNextObjectInstance,
  GetAttributeSingle: CommonServices.GetAttributeSingle,
  /** Class Specific */
  ConnectionBind: 0x4B,
  ProducingApplicationLookup: 0x4C,
  SafetyClose: 0x4E,
  SafetyOpen: 0x54
};


// CIP Vol 1, Table 3-4.9
const InstanceAttributeCodes = {
  State: 1,
  Type: 2,
  TransportClassTrigger: 3,
  DeviceNetProducedConnectionID: 4,
  DeviceNetConsumedConnectionID: 5,
  DeviceNetInitialCommCharacteristics: 6,
  ProducedConnectionSize: 7,
  ConsumedConnectionSize: 8,
  ExpectedPacketRate: 9,
  CIPProducedConnectionID: 10,
  CIPConsumedConnectionID: 11,
  WatchdogTimeoutAction: 12,
  ProducedConnectionPathLength: 13,
  ProducedConnectionPath: 14,
  ConsumedConnectionPathLength: 15,
  ConsumedConnectionPath: 16,
  ProductionInhibitTime: 17,
  ConnectionTimeoutMultiplier: 18,
  ConnectionBindingList: 19
};


const InstanceAttributeNames = InvertKeyValues(InstanceAttributeCodes);


const InstanceAttributeDataTypes = {
  [InstanceAttributeCodes.State]: DataType.USINT,
  [InstanceAttributeCodes.Type]: DataType.USINT,
  [InstanceAttributeCodes.TransportClassTrigger]: DataType.BYTE,
  [InstanceAttributeCodes.DeviceNetProducedConnectionID]: DataType.UINT,
  [InstanceAttributeCodes.DeviceNetConsumedConnectionID]: DataType.UINT,
  [InstanceAttributeCodes.DeviceNetInitialCommCharacteristics]: DataType.BYTE,
  [InstanceAttributeCodes.ProducedConnectionSize]: DataType.UINT,
  [InstanceAttributeCodes.ConsumedConnectionSize]: DataType.UINT,
  [InstanceAttributeCodes.ExpectedPacketRate]: DataType.UINT,
  [InstanceAttributeCodes.CIPProducedConnectionID]: DataType.UDINT,
  [InstanceAttributeCodes.CIPConsumedConnectionID]: DataType.UDINT,
  [InstanceAttributeCodes.WatchdogTimeoutAction]: DataType.USINT,
  [InstanceAttributeCodes.ProducedConnectionPathLength]: DataType.UINT,
  [InstanceAttributeCodes.ProducedConnectionPath]: DataType.EPATH(false),
  [InstanceAttributeCodes.ConsumedConnectionPathLength]: DataType.UINT,
  [InstanceAttributeCodes.ConsumedConnectionPath]: DataType.EPATH(false),
  [InstanceAttributeCodes.ProductionInhibitTime]: DataType.UINT,
  [InstanceAttributeCodes.ConnectionTimeoutMultiplier]: DataType.USINT,
  [InstanceAttributeCodes.ConnectionBindingList]: DataType.STRUCT([DataType.SMEMBER(DataType.UINT, true), DataType.PLACEHOLDER], function (members) {
    if (members.length === 1) {
      return DataType.ARRAY(DataType.UINT, 0, members[0]);
    }
  })
};


// CIP Vol1 Table 3-4.10
const InstanceStateNames = {
  0: 'Non-existent',
  1: 'Configuring',
  2: 'Waiting for connection ID',
  3: 'Established',
  4: 'Timed out',
  5: 'Deferred delete',
  6: 'Closing'
};


// CIP Vol1 Table 3-4.11
const InstanceTypeNames = {
  0: 'Explicit Messaging',
  1: 'I/O',
  2: 'CIP Bridged'
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
