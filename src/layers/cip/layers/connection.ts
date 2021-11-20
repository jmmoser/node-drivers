import CIPRequest from '../../../core/cip/request';
import { GeneralStatusCodes, ClassCodes } from '../../../core/cip/constants/index';
import Layer from '../../layer';
import { LayerNames } from '../../constants';
import ConnectionManager from '../../../core/cip/objects/ConnectionManager';
import Connection, {
  ConnectionOptions,
  TypeCodes,
  PriorityCodes,
  SizeTypeCodes,
  TransportClassCodes,
  TransportProductionTriggerCodes,
  TransportDirectionCodes,
} from '../../../core/cip/objects/Connection';
import EPath from '../../../core/cip/epath/index';

import EIPLayer from '../../eip';

const LARGE_FORWARD_OPEN_SERVICE = ConnectionManager.ServiceCodes.LargeForwardOpen;

const MaximumLargeConnectionSize = 0xFFFF;
const MaximumNormalConnectionSize = 0b111111111; /** 511 */

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

// function mergeOptionsWithDefaults(self: CIPConnectionLayer, options) {
//   const opts = options || {};

//   opts.route = opts.route || [];

//   self.route = EPath.Encode(true, opts.fullRoute || [
//     ...opts.route,
//     new EPath.Segments.Logical(EPath.Segments.Logical.Types.ClassID, ClassCodes.MessageRouter),
//     new EPath.Segments.Logical(EPath.Segments.Logical.Types.InstanceID, 1),
//   ]);
// }

function stopResend(self: CIPConnectionLayer) {
  if (self.__resendInterval != null) {
    clearInterval(self.__resendInterval);
    self.__resendInterval = null;
  }
}

function startResend(self: CIPConnectionLayer, lastMessage) {
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
function send(self: CIPConnectionLayer, connected, internal, requestObj, contextOrCallback) {
  let context;
  let callback;
  if (internal && typeof contextOrCallback === 'function') {
    callback = contextOrCallback;
  } else {
    context = contextOrCallback;
  }

  const request = requestObj instanceof CIPRequest ? requestObj.encode() : requestObj;

  if (connected) {
    const sequenceCount = self.connection.incrementSequenceCount();

    if (internal && callback) {
      context = self.contextCallback(callback, `c${sequenceCount}`);
    }

    self.setContextForID(sequenceCount, {
      context,
      internal,
      request: requestObj,
    });

    const buffer = Connection.EncodeConnectedMessage(sequenceCount, request);

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

function handleConnectedMessage(self: CIPConnectionLayer, data: Buffer, info: any) {
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

  const savedContext = self.getContextForID(sequenceCount.toString(), false);
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

function connect(self: CIPConnectionLayer) {
  if (self._connectionState === 1 || self._connectionState === 2) {
    return self._connect;
  }

  if (self._connectionState === -1) {
    return undefined;
  }

  self._connectionState = 1;

  const request = ConnectionManager.ForwardOpen(self.connection, true);

  self._connect = new Promise((resolve) => {
    send(self, false, true, request, async (err?: Error, res) => {
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

export default class CIPConnectionLayer extends Layer {
  _connectionState: number;
  _disconnect?: Promise<any>;
  route?: Buffer;

  connection: Connection;

  constructor(lowerLayer: Layer, options?: ConnectionOptions) {
    if (lowerLayer == null) {
      throw new Error('Lower layer is currently required to use ');
    } else if ([LayerNames.TCP, LayerNames.UDP].indexOf(lowerLayer.name) >= 0) {
      lowerLayer = new EIPLayer(lowerLayer);
    }

    super('cip.connection', lowerLayer);

    this._connectionState = 0;

    this.connection = new Connection(options);
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
        resolve(undefined);
      }, 5000);

      const request = ConnectionManager.ForwardClose(this.connection);

      send(this, false, true, request, (err, res) => {
        clearTimeout(disconnectTimeout);
        if (err || res == null || res.status.code !== 0) {
          console.log('CIP connection unsuccessful close', err, res);
          this.destroy(new Error('Forward Close error'));
        }
        this._connectionState = 0;
        resolve(undefined);
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
        }
      }
    } else if (this._connectionState === 2) {
      const request = this.getNextRequest();

      if (request) {
        if (request.context == null) {
          throw new Error('CIP Connection Error: Connected messages must include a context');
        }
        send(this, true, false, request.message, request.context);
      }
    }
  }

  handleData(data: Buffer, info: any, context: any) {
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
    this.sendInfo = null;
  }
}
