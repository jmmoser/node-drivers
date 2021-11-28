import CIPRequest from '../../../core/cip/request';
import { GeneralStatusCodes } from '../../../core/cip/constants/index';
import Layer from '../../layer';
import { LayerNames } from '../../constants';
import ConnectionManager from '../../../core/cip/objects/ConnectionManager';
import Connection from '../../../core/cip/objects/Connection';
import EIPLayer from '../../eip';
import CreateCounter from '../../../counter';
const LARGE_FORWARD_OPEN_SERVICE = ConnectionManager.ServiceCodes.LargeForwardOpen;
function stopResend(self) {
    if (self._resendInterval != null) {
        clearInterval(self._resendInterval);
        self._resendInterval = undefined;
    }
}
function startResend(self, lastMessage) {
    stopResend(self);
    self._resendInterval = setInterval(() => {
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
    }
    else {
        context = contextOrCallback;
    }
    const request = requestObj instanceof CIPRequest ? requestObj.encode() : requestObj;
    if (connected) {
        const sequenceCount = self.connection.incrementSequenceCount();
        if (internal && callback) {
            context = self.contextCallback(callback, `c${sequenceCount}`);
        }
        self.setContextForID(sequenceCount.toString(), {
            context,
            internal,
            request: requestObj,
        });
        const buffer = Connection.EncodeConnectedMessage(sequenceCount, request);
        self.send(buffer, self.sendInfo, false);
        startResend(self, buffer);
    }
    else {
        if (internal && callback) {
            const counter = self._counter();
            context = self.contextCallback(callback, `iu${counter}`);
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
            callback(response.status.error ? response.status.description || 'CIP Error' : null, response);
        }
        // else {
        //   /** Request may have already timed out but we still received the response later */
        // }
    }
    else {
        /** Unconnected message for upper layer */
        self.forward(data, info, context.context);
    }
}
function handleConnectedMessage(self, data, info) {
    if (self.sendInfo == null || info == null) {
        console.log('CIP Connection unhandled connected message, not connected', data, info);
        return;
    }
    if (self.sendInfo.connectionID !== info.connectionID
        || self.sendInfo.responseID !== info.responseID) {
        console.log('CIP Connection unhandled connected message, invalid Originator and/or Target connection identifiers', data, info);
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
            callback(response.status.error ? response.status.description || 'CIP Error' : null, response);
        }
        else {
            console.log('CIP.Connection: Unhandled data received.', data);
        }
    }
    else {
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
    const request = ConnectionManager.ForwardOpen(self.connection, true);
    self._connect = new Promise((resolve) => {
        send(self, false, true, request, async (err, res) => {
            if (err) {
                self._connectionState = 0;
                if (res) {
                    if (res.service.code === LARGE_FORWARD_OPEN_SERVICE
                        && res.status.code === GeneralStatusCodes.ServiceNotSupported) {
                        self.connection.options.networkConnectionParameters.maximumSize = 500;
                        self.connection.large = false;
                        self.connection.OtoTNetworkConnectionParametersCode = Connection.BuildNetworkConnectionParametersCode(self.connection.options.networkConnectionParameters);
                        self.connection.TtoONetworkConnectionParametersCode = Connection.BuildNetworkConnectionParametersCode(self.connection.options.networkConnectionParameters);
                        console.log('Large forward open not supported. Attempting normal forward open');
                        connect(self);
                    }
                    else {
                        // console.log('CIPConnection Err: Status is not successful or service is not correct');
                        ConnectionManager.TranslateResponse(res);
                        if (res.status.code === 1
                            && Buffer.compare(res.status.extended, Buffer.from([0x00, 0x01])) === 0
                            && !self._closeAndReconnect) {
                            self._closeAndReconnect = true;
                            const closeRequest = ConnectionManager.ForwardClose(self.connection);
                            send(self, false, true, closeRequest, (closeErr, closeRes) => {
                                if (closeErr || closeRes == null || closeRes.status.code !== 0) {
                                    console.log('CIP connection unsuccessful close', closeErr, closeRes);
                                    self.destroy(new Error('Forward Close error'));
                                }
                                else {
                                    self._closeAndReconnect = false;
                                    self._connectionState = 0;
                                    connect(self);
                                }
                            });
                        }
                        else {
                            self.destroy(new Error(`${self.name} error: ${res.status.name}, ${res.status.description}`));
                        }
                        // self.destroy(`${self.name} error: ${res.status.name}, ${res.status.description}`);
                    }
                }
            }
            else if (self._connectionState === 1) {
                const reply = res.value;
                self.connection.options.OtoTConnectionID = reply.OtoTNetworkConnectionID;
                self.connection.options.TtoOConnectionID = reply.TtoONetworkConnectionID;
                self.connection.options.OtoTPacketRate = reply.OtoTActualPacketRate;
                self.connection.options.TtoOPacketRate = reply.TtoOActualPacketRate;
                self.connection.options.connectionSerialNumber = reply.ConnectionSerialNumber;
                const rpi = self.connection.options.OtoTPacketRate < self.connection.options.TtoOPacketRate
                    ? self.connection.options.OtoTPacketRate
                    : self.connection.options.TtoOPacketRate;
                self._connectionTimeout = 4 * (rpi / 1e6) * (2 ** self.connection.options.connectionTimeoutMultiplier);
                self.sendInfo = {
                    connectionID: self.connection.options.OtoTConnectionID,
                    responseID: self.connection.options.TtoOConnectionID,
                };
                // await self.readAttributes();
                self._connectionState = 2;
                // console.log('CIP Connection connected');
                self.sendNextMessage();
            }
            resolve(undefined);
        });
    });
    return undefined;
}
export default class CIPConnectionLayer extends Layer {
    constructor(lowerLayer, options) {
        if (lowerLayer == null) {
            throw new Error('Lower layer is currently required to use ');
        }
        else if ([LayerNames.TCP, LayerNames.UDP].indexOf(lowerLayer.name) >= 0) {
            lowerLayer = new EIPLayer(lowerLayer);
        }
        super('cip.connection', lowerLayer);
        this._connectionState = 0;
        this._closeAndReconnect = false;
        this.connection = new Connection(options);
        this._counter = CreateCounter({ maxValue: 0x100000000 });
        this._connectionTimeout = 10000;
    }
    disconnect() {
        if (this._connectionState === 0) {
            return Promise.resolve();
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
                if (err || res == null || res.status?.code !== 0) {
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
                }
                else {
                    const request = this.getNextRequest();
                    send(this, false, false, request.message, request.context);
                }
            }
        }
        else if (this._connectionState === 2) {
            const request = this.getNextRequest();
            if (request) {
                if (request.context == null) {
                    throw new Error('CIP Connection Error: Connected messages must include a context');
                }
                send(this, true, false, request.message, request.context);
            }
        }
    }
    handleData(data, info, context) {
        if (context != null) {
            /** Unconnected Message */
            handleUnconnectedMessage(this, data, info, context);
        }
        else {
            /** Connected message, context should not be used for connected messages */
            handleConnectedMessage(this, data, info);
        }
    }
    handleDestroy() {
        this._connectionState = 0;
        this.sendInfo = undefined;
    }
}
