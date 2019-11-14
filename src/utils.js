'use strict';

// http://stackoverflow.com/a/10090443/3055415
function getBits(k, m, n) {
  return ((k >> m) & ((1 << (n - m)) - 1));
}

function getBit(k, n) {
  return ((k) & (1 << n)) > 0 ? 1 : 0;
}


/**
 * @param {Object|Map} obj 
 */
function InvertKeyValues(obj) {
  let inverted;
  const type = Object.prototype.toString.call(obj);
  if (type === '[object Object]') {
    inverted = {};
    for (let [key, value] of Object.entries(obj)) {
      inverted[value] = key;
    }
  } else if (type === '[object Map]') {
    inverted = new Map();
    for (let [key, value] of obj.entries()) {
      inverted.set(value, key);
    }
  }
  return inverted;
}


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
      reject: function (message, info) {
        if (active) {
          const err = { message };
          if (info != null) {
            err.info = info;
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

    return func(resolver);
  });
}


module.exports = {
  getBits,
  getBit,
  once,
  InvertKeyValues,
  CallbackPromise
};