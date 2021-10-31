import { InvertKeyValues } from '../../../../utils.js';
import CIPRequest from '../../../../core/cip/request.js';
import { GeneralStatusCodes, ClassCodes } from '../../../../core/cip/constants/index.js';
import { DataType } from '../../../../core/cip/datatypes/index.js';
import Layer from '../../../layer.js';
import ConnectionManager from '../../../../core/cip/objects/ConnectionManager.js';
import EPath from '../../../../core/cip/epath/index.js';

import EIPLayer from '../EIP/index.js';
import TCPLayer from '../../../tcp.js';
import UDPLayer from '../../../udp.js';

const LARGE_FORWARD_OPEN_SERVICE = ConnectionManager.ServiceCodes.LargeForwardOpen;

const MaximumLargeConnectionSize = 0xFFFF;
const MaximumNormalConnectionSize = 0b111111111; /** 511 */

const TypeCodes = Object.freeze({
  Null: 0,
  Multicast: 1,
  PointToPoint: 2,
});

const PriorityCodes = Object.freeze({
  Low: 0,
  High: 1,
  Scheduled: 2,
  Urgent: 3,
});

const SizeTypeCodes = Object.freeze({
  Fixed: 0,
  Variable: 1,
});

/** For Transport Class Trigger Attribute */
const TransportClassCodes = Object.freeze({
  Class0: 0,
  Class1: 1,
  Class2: 2,
  Class3: 3,
});

const TransportProductionTriggerCodes = Object.freeze({
  Cyclic: 0,
  ChangeOfState: 1,
  ApplicationObject: 2,
});

const TransportDirectionCodes = Object.freeze({
  Client: 0,
  Server: 1,
});

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

const TransportClassCodesSet = new Set(
  Object.values(TransportClassCodes),
);
const TransportProductionTriggerCodesSet = new Set(
  Object.values(TransportProductionTriggerCodes),
);
const TransportDirectionCodesSet = new Set(
  Object.values(TransportDirectionCodes),
);

function buildTransportClassTriggerCode(transport) {
  if (!TransportClassCodesSet.has(transport.transportClass)) {
    throw new Error(`CIP Connection invalid transport class ${transport.transportClass}`);
  }
  if (!TransportProductionTriggerCodesSet.has(transport.productionTrigger)) {
    throw new Error(`CIP Connection invalid transport production trigger ${transport.productionTrigger}`);
  }
  if (!TransportDirectionCodesSet.has(transport.direction)) {
    throw new Error(`CIP Connection invalid transport direction ${transport.direction}`);
  }
  return (
    ((transport.direction & 0b1) << 7)
    | ((transport.productionTrigger & 0b111) << 4)
    | ((transport.transportClass & 0b1111))
  );
}

function mergeOptionsWithDefaults(self, options) {
  const opts = options || {};

  self.networkConnectionParameters = {
    redundantOwner: 0,
    type: TypeCodes.PointToPoint,
    priority: PriorityCodes.Low,
    sizeType: SizeTypeCodes.Variable,
    maximumSize: 500,
    ...opts.networkConnectionParameters,
  };

  self.transport = {
    transportClass: TransportClassCodes.Class3,
    productionTrigger: TransportProductionTriggerCodes.ApplicationObject,
    direction: TransportDirectionCodes.Server,
    ...opts.transport,
  };

  self.timing = {
    tickTime: 6,
    timeoutTicks: 156,
    ...opts.timing,
  };

  self.transportClass = opts.transportClass || TransportClassCodes.Class3;

  self.transportProductionTrigger = (
    opts.transportProductionTrigger
    || TransportProductionTriggerCodes.ApplicationObject
  );

  self.transportDirection = opts.transportDirection || TransportDirectionCodes.Server;

  self.large = self.networkConnectionParameters.maximumSize > MaximumNormalConnectionSize;

  self.VendorID = opts.VendorID || 0x1339;
  self.OriginatorSerialNumber = opts.OriginatorSerialNumber || 42;
  self.ConnectionTimeoutMultiplier = opts.ConnectionTimeoutMultiplier || 0x01;

  // Originator to Target requested packet interval (microseconds)
  self.OtoTRPI = opts.OtoTRPI || 2000000;
  self.OtoTNetworkConnectionParameters = buildNetworkConnectionParametersCode(
    self.networkConnectionParameters,
  );
  self.TtoORPI = opts.TtoORPI || 2000000;
  self.TtoONetworkConnectionParameters = buildNetworkConnectionParametersCode(
    self.networkConnectionParameters,
  );
  self.TransportClassTrigger = buildTransportClassTriggerCode(self.transport);

  opts.route = opts.route || [];

  self.route = EPath.Encode(true, opts.fullRoute || [
    ...opts.route,
    new EPath.Segments.Logical.ClassID(ClassCodes.MessageRouter),
    new EPath.Segments.Logical.InstanceID(0x01),
  ]);
}

function incrementSequenceCount(self) {
  self._sequenceCount = (self._sequenceCount + 1) % 0x10000;
  return self._sequenceCount;
}

function stopResend(self) {
  if (self.__resendInterval != null) {
    clearInterval(self.__resendInterval);
    self.__resendInterval = null;
  }
}

function startResend(self, lastMessage) {
  stopResend(self);

  self.__resendInterval = setInterval(() => {
    self.send(lastMessage, self.sendInfo, false, null);
  }, Math.floor(self._connectionTimeout * (3 / 4)) * 1000);
}

/**
 * Request
 *  connected, internal => callback
 *  connected, external => context
 *  unconnected, internal => callback
 *  unconnected, external => context
 */
function send(self, connected, internal, requestObj, contextOrCallback) {
  let context;
  let callback;
  if (internal && typeof contextOrCallback === 'function') {
    callback = contextOrCallback;
  } else {
    context = contextOrCallback;
  }

  const request = requestObj instanceof CIPRequest ? requestObj.encode() : requestObj;

  if (connected) {
    const sequenceCount = incrementSequenceCount(self);

    if (internal && callback) {
      context = self.contextCallback(callback, `c${sequenceCount}`);
    }

    self.setContextForID(sequenceCount, {
      context,
      internal,
      request: requestObj,
    });

    const buffer = Buffer.allocUnsafe(request.length + 2);
    buffer.writeUInt16LE(sequenceCount, 0);
    request.copy(buffer, 2);

    self.send(buffer, self.sendInfo, false);

    startResend(self, buffer);
  } else {
    if (internal && callback) {
      context = self.contextCallback(callback, (c) => `iu${c}`);
    }

    self.send(request, null, false, {
      internal,
      context,
      request: requestObj,
    });
  }
}

function handleUnconnectedMessage(self, data, info, context) {
  if (!context) {
    console.log('CIP Connection unhandled unconnected message, no context', data);
    return;
  }
  // console.log(data, info, context);

  if (context.internal === true) {
    const callback = self.callbackForContext(context.context);
    if (callback) {
      const response = context.request.response(data, { current: 0 });

      callback(
        response.status.error ? response.status.description || 'CIP Error' : null,
        response,
      );
    }
    // else {
    //   /** Request may have already timed out but we still received the response later */
    // }
  } else {
    /** Unconnected message for upper layer */
    self.forward(data, info, context.context);
  }
}

function handleConnectedMessage(self, data, info) {
  if (self.sendInfo == null || info == null) {
    console.log(
      'CIP Connection unhandled connected message, not connected',
      data,
      info,
    );
    return;
  }

  if (
    self.sendInfo.connectionID !== info.connectionID
    || self.sendInfo.responseID !== info.responseID
  ) {
    console.log(
      'CIP Connection unhandled connected message, invalid Originator and/or Target connection identifiers',
      data,
      info,
    );
    return;
  }

  const sequenceCount = data.readUInt16LE(0);

  const savedContext = self.getContextForID(sequenceCount);
  if (!savedContext) {
    /* This happens when the last message is resent to prevent CIP connection timeout disconnect */
    return;
  }

  data = data.slice(2);

  if (savedContext.internal) {
    const callback = self.callbackForContext(savedContext.context);
    if (callback != null) {
      const response = savedContext.request.response(data);

      callback(
        response.status.error ? response.status.description || 'CIP Error' : null,
        response,
      );
    } else {
      console.log('CIP.Connection: Unhandled data received.', data);
    }
  } else {
    self.forward(data, null, savedContext.context);
  }
}

function connect(self) {
  if (self._connectionState === 1 || self._connectionState === 2) {
    return self._connect;
  }

  if (self._connectionState === -1) {
    return undefined;
  }

  self._connectionState = 1;

  const request = ConnectionManager.ForwardOpen(self, true);

  self._connect = new Promise((resolve) => {
    send(self, false, true, request, async (err, res) => {
      if (err) {
        self._connectionState = 0;

        if (res) {
          if (
            res.service.code === LARGE_FORWARD_OPEN_SERVICE
            && res.status.code === GeneralStatusCodes.ServiceNotSupported
          ) {
            self.networkConnectionParameters.maximumSize = 500;
            self.large = false;
            self.OtoTNetworkConnectionParameters = buildNetworkConnectionParametersCode(
              self.networkConnectionParameters,
            );
            self.TtoONetworkConnectionParameters = buildNetworkConnectionParametersCode(
              self.networkConnectionParameters,
            );
            console.log('Large forward open not supported. Attempting normal forward open');
            connect(self);
          } else {
            // console.log('CIPConnection Err: Status is not successful or service is not correct');
            ConnectionManager.TranslateResponse(res);

            if (
              res.status.code === 1
              && Buffer.compare(res.status.extended, Buffer.from([0x00, 0x01])) === 0
              && !self._closeAndReconnect
            ) {
              self._closeAndReconnect = true;
              const closeRequest = ConnectionManager.ForwardClose(self);

              send(self, false, true, closeRequest, (closeErr, closeRes) => {
                if (closeErr || closeRes == null || closeRes.status.code !== 0) {
                  console.log('CIP connection unsuccessful close', closeErr, closeRes);
                  self.destroy('Forward Close error');
                } else {
                  self._closeAndReconnect = false;
                  self._connectionState = 0;
                  connect(self);
                }
              });
            } else {
              self.destroy(`${self.name} error: ${res.status.name}, ${res.status.description}`);
            }
            // self.destroy(`${self.name} error: ${res.status.name}, ${res.status.description}`);
          }
        }
      } else if (self._connectionState === 1) {
        const reply = res.value;
        self._OtoTConnectionID = reply.OtoTNetworkConnectionID;
        self._TtoOConnectionID = reply.TtoONetworkConnectionID;
        self._OtoTPacketRate = reply.OtoTActualPacketRate;
        self._TtoOPacketRate = reply.TtoOActualPacketRate;
        self._connectionSerialNumber = reply.ConnectionSerialNumber;

        const rpi = self._OtoTPacketRate < self._TtoOPacketRate
          ? self._OtoTPacketRate
          : self._TtoOPacketRate;

        self._connectionTimeout = 4 * (rpi / 1e6) * (2 ** self.ConnectionTimeoutMultiplier);

        self.sendInfo = {
          connectionID: self._OtoTConnectionID,
          responseID: self._TtoOConnectionID,
        };

        // await self.readAttributes();
        self._connectionState = 2;

        // console.log('CIP Connection connected');
        self.sendNextMessage();
      }
      resolve();
    });
  });

  return undefined;
}

class CIPConnectionLayer extends Layer {
  constructor(lowerLayer, options) {
    if (lowerLayer == null) {
      // lowerLayer = new EIPLayer();
      throw new Error('Lower layer is currently required to use ');
    } else if (lowerLayer instanceof TCPLayer || lowerLayer instanceof UDPLayer) {
      lowerLayer = new EIPLayer(lowerLayer);
    }

    super('connection.cip', lowerLayer);

    mergeOptionsWithDefaults(this, options);

    this._connectionState = 0;
    this._sequenceCount = 0;
  }

  disconnect() {
    if (this._connectionState === 0) {
      return undefined;
    }

    if (this._connectionState === -1) {
      return this._disconnect;
    }

    this._connectionState = -1;

    stopResend(this);

    this._disconnect = new Promise((resolve) => {
      const disconnectTimeout = setTimeout(() => {
        resolve();
      }, 5000);

      const request = ConnectionManager.ForwardClose(this);

      send(this, false, true, request, (err, res) => {
        clearTimeout(disconnectTimeout);
        if (err || res == null || res.status.code !== 0) {
          console.log('CIP connection unsuccessful close', err, res);
          this.destroy('Forward Close error');
        }
        this._connectionState = 0;
        resolve();
      });
    });

    return this._disconnect;
  }

  sendNextMessage() {
    if (this._connectionState === 0) {
      const peek = this.getNextRequest(true);
      if (peek && peek.info) {
        if (peek.info.connected === true) {
          connect(this);
        } else {
          const request = this.getNextRequest();
          send(this, false, false, request.message, request.context);
          setImmediate(() => this.sendNextMessage());
        }
      }
    } else if (this._connectionState === 2) {
      const request = this.getNextRequest();

      if (request) {
        if (request.context == null) {
          throw new Error('CIP Connection Error: Connected messages must include a context');
        }
        send(this, true, false, request.message, request.context);
        setImmediate(() => this.sendNextMessage());
      }
    }
  }

  handleData(data, info, context) {
    if (context != null) {
      /** Unconnected Message */
      handleUnconnectedMessage(this, data, info, context);
    } else {
      /** Connected message, context should not be used for connected messages */
      handleConnectedMessage(this, data, info);
    }
  }

  handleDestroy() {
    this._connectionState = 0;
    this._sequenceCount = 0;
    this.sendInfo = null;
  }
}

export default CIPConnectionLayer;

// /** CIP Vol1 Table 3-4.2 */
// const ClassServices = Object.freeze({
//   /** Common */
//   Create: CommonServiceCodes.Create,
//   Delete: CommonServiceCodes.Delete,
//   Reset: CommonServiceCodes.Reset,
//   FindNextObjectInstance: CommonServiceCodes.FindNextObjectInstance,
//   GetAttributeSingle: CommonServiceCodes.GetAttributeSingle,
//   /** Class Specific */
//   ConnectionBind: 0x4B,
//   ProducingApplicationLookup: 0x4C,
//   SafetyClose: 0x4E,
//   SafetyOpen: 0x54
// });

// CIP Vol 1, Table 3-4.9
const InstanceAttributeCodes = Object.freeze({
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
  ConnectionBindingList: 19,
});

const InstanceAttributeNames = InvertKeyValues(InstanceAttributeCodes);

const InstanceAttributeDataTypes = Object.freeze({
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
  [InstanceAttributeCodes.ConnectionBindingList]: DataType.TRANSFORM(
    DataType.STRUCT([
      DataType.UINT,
      DataType.PLACEHOLDER((length) => DataType.ABBREV_ARRAY(DataType.UINT, length)),
    ], (members, dt) => {
      if (members.length === 1) {
        return dt.resolve(members[0]);
      }
      return undefined;
    }),
    (val) => val[1],
  ),
});

// CIP Vol1 Table 3-4.10
const InstanceStateNames = Object.freeze({
  0: 'Non-existent',
  1: 'Configuring',
  2: 'Waiting for connection ID',
  3: 'Established',
  4: 'Timed out',
  5: 'Deferred delete',
  6: 'Closing',
});

// CIP Vol1 Table 3-4.11
const InstanceTypeNames = Object.freeze({
  0: 'Explicit Messaging',
  1: 'I/O',
  2: 'CIP Bridged',
});

// CIP Vol1 Table 3-4.5
const ConnectionBindServiceStatusCodeDescriptions = Object.freeze({
  0x02: {
    0x01: 'One or both of the connection instances is Non-existent',
    0x02: 'The connection class and/or instance is out of resources to bind instances',
  },
  0x0C: {
    0x01: 'Both of the connection instances are existent, but at least one is not in the established state',
  },
  0x20: {
    0x01: 'Both connection instances are the same value',
  },
  0xD0: {
    0x01: 'One or both of the connection instances is not a dynamically created I/O connection',
    0x02: 'One or both of the connection instances were created internally and the device is not allowing a binding to it',
  },
});
