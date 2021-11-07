// http://stackoverflow.com/a/10090443/3055415
export function getBits(k, m, n) {
    return ((k >> m) & ((1 << (n - m)) - 1));
}
export function unsignedIntegerSize(i) {
    if (i < 0x10000) {
        if (i < 0x100)
            return 1;
        return 2;
    }
    if (i < 0x100000000)
        return 4;
    return 8;
}
export function encodeUnsignedInteger(data, offset, value, size) {
    switch (size) {
        case 1:
            return data.writeUInt8(value, offset);
        case 2:
            return data.writeUInt16LE(value, offset);
        case 4:
            return data.writeUInt32LE(value, offset);
        case 8:
            return data.writeBigUInt64LE(value, offset);
        default:
            throw new Error(`Invalid size: ${size}`);
    }
}
export function decodeUnsignedInteger(data, offset, size) {
    switch (size) {
        case 1:
            return data.readUInt8(offset);
        case 2:
            return data.readUInt16LE(offset);
        case 4:
            return data.readUInt32LE(offset);
        case 8:
            return data.readBigUInt64LE(offset);
        default:
            throw new Error(`Invalid size: ${size}`);
    }
}
/**
 * @param {Object|Map} obj
 */
export function InvertKeyValues(obj) {
    let inverted = {};
    Object.entries(obj).forEach(([key, value]) => {
        inverted[value] = key;
    });
    return inverted;
}
/**
 * @param {Function} fn
 * @param {*} context
 */
export function once(fn, context) {
    let result;
    let called = false;
    return (...args) => {
        if (!called) {
            result = fn.apply(context, args);
            called = true;
        }
        return result;
    };
}
/** https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error */
export class InfoError extends Error {
    constructor(info, err, ...params) {
        // Pass remaining arguments (including vendor specific ones) to parent constructor
        if (typeof err === 'object' && err.message) {
            super(err.message, ...params);
        }
        else {
            super(err, ...params);
        }
        // Maintains proper stack trace for where our error was thrown (only available on V8)
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, InfoError);
        }
        this.name = 'InfoError';
        this.info = info;
    }
}
export function CallbackPromise(callback, func, timeout) {
    const hasCallback = typeof callback === 'function';
    return new Promise((resolve, reject) => {
        let timeoutHandle;
        let active = true;
        const resolver = {
            resolve: (res) => {
                if (active) {
                    active = false;
                    clearTimeout(timeoutHandle);
                    if (hasCallback) {
                        callback(undefined, res);
                    }
                    resolve(res);
                }
            },
            reject: (err, info) => {
                if (active) {
                    let error = err;
                    if (typeof err === 'string') {
                        error = new InfoError(info, err);
                    }
                    else if (err instanceof Error && info != null && err.info == null) {
                        error = new InfoError(info, err);
                    }
                    else if (!(err instanceof Error)) {
                        error = new Error(err);
                    }
                    active = false;
                    clearTimeout(timeoutHandle);
                    if (hasCallback) {
                        callback(error);
                        resolve(undefined);
                    }
                    else {
                        reject(error);
                    }
                }
            },
        };
        if (Number.isFinite(timeout)) {
            timeoutHandle = setTimeout(() => {
                resolver.reject('Timeout');
            }, timeout);
        }
        try {
            return func(resolver);
        }
        catch (err) {
            resolver.reject(err);
            return resolver;
        }
    });
}