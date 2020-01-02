'use strict';

// http://stackoverflow.com/a/10090443/3055415
function getBits(k, m, n) {
  return ((k >> m) & ((1 << (n - m)) - 1));
}

function getBit(k, n) {
  return ((k) & (1 << n)) > 0 ? 1 : 0;
}


function unsignedIntegerSize(i) {
  if (i < 0x10000) {
    if (i < 0x100) return 1;
    else return 2;
  } else {
    if (i < 0x100000000/*L*/) return 4;
    else return 8;
  }
}


function encodeUnsignedInteger(data, offset, value, size) {
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

function decodeUnsignedInteger(data, offset, size) {
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
function InvertKeyValues(obj) {
  let inverted;
  switch (Object.prototype.toString.call(obj)) {
    case '[object Object]':
      inverted = {};
      for (let [key, value] of Object.entries(obj)) {
        inverted[value] = key;
      }
      break;
    case '[object Map]':
      inverted = new Map();
      for (let [key, value] of obj.entries()) {
        inverted.set(value, key);
      }
      break;
    default:
      break;
  }
  return inverted;
}
// function InvertKeyValues(obj) {
//   let inverted;
//   const type = Object.prototype.toString.call(obj);
//   if (type === '[object Object]') {
//     inverted = {};
//     for (let [key, value] of Object.entries(obj)) {
//       inverted[value] = key;
//     }
//   } else if (type === '[object Map]') {
//     inverted = new Map();
//     for (let [key, value] of obj.entries()) {
//       inverted.set(value, key);
//     }
//   }
//   return inverted;
// }

/**
 * https://stackoverflow.com/a/12713611/3055415
 * @param {Function} fn 
 * @param {*} context 
 */
function once(fn, context) {
  let result;
  return function() {
    if (fn) {
      result = fn.apply(context || this, arguments);
      fn = null;
    }
    return result;
  };
}


/** https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error */
class InfoError extends Error {
  constructor(info, err, ...params) {
    // Pass remaining arguments (including vendor specific ones) to parent constructor
    if (typeof err === 'object' && err.message) {
      super(err.message, ...params);
    } else {
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


// function InfoError(info, message) {
//   Error.call(this, message);

//   this.message = message;
//   this.info = info;

//   // hide custom error implementation details from end-users
//   Error.captureStackTrace(this, this.constructor);
// }

// InfoError.prototype = Object.create(Error.prototype);
// InfoError.prototype.constructor = InfoError;
// InfoError.prototype.name = 'InfoError';


function CallbackPromise(callback, func, timeout) {
  const hasCallback = typeof callback === 'function';
  return new Promise(async function (resolve, reject) {
    let timeoutHandle;
    let active = true;
    const resolver = {
      resolve: function (res) {
        // console.log(`resolve: ${res}, active: ${active}`);
        if (active) {
          active = false;
          clearTimeout(timeoutHandle);
          if (hasCallback) {
            callback(null, res);
          }
          resolve(res);
        }
      },
      reject: function (err, info) {
        if (active) {
          if (typeof err === 'string') {
            err = new InfoError(info, err);
          } else if (err instanceof Error && info != null && err.info == null) {
            err = new InfoError(info, err.message);
          } else if (!(err instanceof Error)) {
            err = new Error(err);
          }

          active = false;
          clearTimeout(timeoutHandle);
          if (hasCallback) {
            callback(err);
            resolve();
          } else {
            reject(err);
          }
        }
      }
    };

    if (Number.isFinite(timeout)) {
      timeoutHandle = setTimeout(function () {
        resolver.reject('Timeout');
      }, timeout);
    }

    try {
      return await func(resolver);
    } catch (err) {
      resolver.reject(err);
      return resolver;
    }
  });
}


module.exports = {
  getBits,
  getBit,
  unsignedIntegerSize,
  encodeUnsignedInteger,
  decodeUnsignedInteger,
  once,
  InvertKeyValues,
  CallbackPromise,
  InfoError
};