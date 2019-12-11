'use strict';

// http://stackoverflow.com/a/10090443/3055415
function getBits(k, m, n) {
  return ((k >> m) & ((1 << (n - m)) - 1));
}

function getBit(k, n) {
  return ((k) & (1 << n)) > 0 ? 1 : 0;
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

    this.info = info;
  }
}


function CallbackPromise(callback, func, timeout) {
  const hasCallback = typeof callback === 'function';
  return new Promise(function (resolve, reject) {
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
      // reject: function (message, info) {
      //   if (active) {
      //     const err = { message };
      //     if (info != null) {
      //       err.info = info;
      //     }
      //     active = false;
      //     clearTimeout(timeoutHandle);
      //     if (hasCallback) {
      //       callback(err);
      //       resolve();
      //     } else {
      //       reject(err);
      //     }
      //   }
      // }
    };

    if (Number.isFinite(timeout)) {
      timeoutHandle = setTimeout(function () {
        resolver.reject('Timeout');
      }, timeout);
    }

    return func(resolver);
  });
}


module.exports = {
  getBits,
  getBit,
  encodeUnsignedInteger,
  decodeUnsignedInteger,
  once,
  InvertKeyValues,
  CallbackPromise,
  InfoError
};