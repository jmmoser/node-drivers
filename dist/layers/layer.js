import EventEmitter from 'events';
import Queue from '../queue';
import Defragger from '../defragger';
import { CallbackPromise } from '../utils';
import CreateCounter from '../counter';
const LOG = false;
function passDefaultOptionsDown(defaultOptions, upperLayer) {
    let lowerLayer = upperLayer;
    while ((lowerLayer = lowerLayer._lowerLayer)) { // eslint-disable-line no-cond-assign
        const layerSpecificDefaultOptions = defaultOptions[lowerLayer.name];
        if (layerSpecificDefaultOptions) {
            lowerLayer.handleDefaultOptions(layerSpecificDefaultOptions, upperLayer);
        }
    }
}
function internalDestroy(layer, error) {
    /** Clear all internal context callbacks */
    // eslint-disable-next-line no-underscore-dangle
    layer._contextToCallbackTimeouts.forEach((handle) => clearTimeout(handle));
    layer._contextToCallbackTimeouts.clear(); // eslint-disable-line no-underscore-dangle
    layer._contextToCallback.forEach((cb) => {
        cb(error);
    }); // eslint-disable-line no-underscore-dangle
    layer._contextToCallback.clear(); // eslint-disable-line no-underscore-dangle
    layer._idContext.clear(); // eslint-disable-line
    layer.clearRequestQueue();
    layer.handleDestroy(error);
}
export default class Layer extends EventEmitter {
    constructor(name, lowerLayer, options, defaultOptions) {
        if (!name || typeof name !== 'string') {
            throw new Error('Layer name must be a non-empty string');
        }
        super();
        const opts = {
            handlesForwarding: false,
            // Context: incrementContext,
            ...options,
        };
        this._queue = new Queue();
        this._lowerLayer = lowerLayer;
        this._handlesForwarding = opts.handlesForwarding === true;
        this._name = name;
        this._counter = CreateCounter({ maxValue: 0x100000000 });
        this._contextToCallback = new Map();
        this._contextToCallbackTimeouts = new Map();
        this._idContext = new Map();
        if (lowerLayer != null) {
            if (lowerLayer._handlesForwarding !== true) {
                lowerLayer._upperLayer = this;
            }
            lowerLayer.layerAdded(this);
        }
        if (defaultOptions) {
            passDefaultOptionsDown(defaultOptions, this);
        }
    }
    get name() {
        return this._name;
    }
    setDefragger(lengthCallbackFunc) {
        this._defragger = new Defragger(lengthCallbackFunc, this.name);
        return this;
    }
    /** OVERRIDE IF NEEDED */
    handleDefaultOptions(defaultOptions, upperLayer) { } // eslint-disable-line
    /** OVERRIDE IF NEEDED */
    disconnect(callback) {
        return CallbackPromise(callback, (resolver) => {
            resolver.resolve();
        });
    }
    /** OVERRIDE IF NEEDED, Use in lower layers to handle additions of upper layers */
    layerAdded(layer) { } // eslint-disable-line
    /** OVERRIDE IF NEEDED, Use in lower layers to handle removals of upper layers */
    layerRemoved(layer) { } // eslint-disable-line
    /** OVERRIDE */
    sendNextMessage() { } // eslint-disable-line
    /** OVERRIDE */
    handleData(data, info, context) { } // eslint-disable-line
    /** OVERRIDE IF NEEDED */
    handleDestroy(error) { } // eslint-disable-line
    close(callback) {
        return CallbackPromise(callback, async (resolver) => {
            if (this._upperLayer != null) {
                await this._upperLayer.close();
            }
            await this.disconnect();
            /** Do not bubble up since close has already bubbled up */
            internalDestroy(this, new Error('Close'));
            // console.log(`Closed: ${this.name}`);
            resolver.resolve();
        });
    }
    destroy(error) {
        if (this._upperLayer != null) {
            this._upperLayer.destroy(error);
        }
        internalDestroy(this, error);
    }
    forward(data, info, context) {
        if (this._upperLayer != null) {
            return Layer.forwardTo(this._upperLayer, data, info, context, this);
        }
        throw new Error('No layer to forward to');
        // return undefined;
    }
    static forwardTo(layer, data, info, context, fromLayer) {
        if (layer._defragger != null) { // eslint-disable-line no-underscore-dangle
            layer._defragger.append(data); // eslint-disable-line no-underscore-dangle
            for (;;) {
                const defraggedData = layer._defragger.defrag();
                if (defraggedData) {
                    Layer.handleData(layer, defraggedData, info, context, fromLayer);
                }
                else {
                    break;
                }
            }
        }
        else {
            Layer.handleData(layer, data, info, context, fromLayer);
        }
    }
    static handleData(layer, data, info, context, fromLayer) {
        layer.emit('data', data, info, context);
        if (LOG) {
            console.log(`${fromLayer.name} -> ${layer.name}`);
            console.log(data);
            console.log('');
        }
        layer.handleData(data, info, context);
    }
    send(message, info, priority, context) {
        this.emit('send', message, info, priority, context);
        const transport = this._lowerLayer != null ? this._lowerLayer : this;
        const obj = {
            layer: this,
            info: info || {},
            message,
            context,
        };
        transport._queue.enqueue(obj, priority);
        this.sendNextMessage();
        transport.sendNextMessage();
    }
    requestQueueSize(priority) {
        return this._queue.size(priority);
    }
    hasRequest(priority) {
        return this.requestQueueSize(priority) > 0;
    }
    getAllRequests() {
        return this._queue.dequeue(true);
    }
    getNextRequest(peek) {
        if (peek === true) {
            return this._queue.peek();
        }
        return this._queue.dequeue();
    }
    clearRequestQueue() {
        this._queue.clear();
    }
    contextCallback(callback, context, timeout) {
        // caller can pass their own context (e.g. PCCCLayer passes the transaction)
        if (typeof callback !== 'function') {
            throw new Error(`callback must be a function, received: ${typeof callback}`);
        }
        this._contextToCallback.set(context, callback);
        if (timeout != null && timeout > 0) {
            const timeoutHandle = setTimeout(() => {
                this._contextToCallback.delete(context);
                callback(`Timeout (${timeout}ms)`);
            }, timeout);
            this._contextToCallbackTimeouts.set(context, timeoutHandle);
        }
        return context;
    }
    callbackForContext(context) {
        if (this._contextToCallback.has(context)) {
            const callback = this._contextToCallback.get(context);
            this._contextToCallback.delete(context);
            if (this._contextToCallbackTimeouts.has(context)) {
                const timeoutHandle = this._contextToCallbackTimeouts.get(context);
                clearTimeout(timeoutHandle);
                this._contextToCallbackTimeouts.delete(context);
            }
            return callback;
        }
        return undefined;
    }
    setContextForID(id, context) {
        if (id != null) {
            this._idContext.set(id, context);
            return true;
        }
        return false;
    }
    getContextForID(id, keep) {
        if (this._idContext.has(id)) {
            const context = this._idContext.get(id);
            if (keep !== true) {
                this._idContext.delete(id);
            }
            return context;
        }
        return undefined;
    }
    clearContexts() {
        const entries = this._idContext.entries();
        this._idContext.clear();
        return entries;
    }
}
