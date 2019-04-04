'use strict';

// http://stackoverflow.com/a/10090443/3055415
function getBits(k, m, n) {
  return ((k >> m) & ((1 << (n - m)) - 1));
}

function getBit(k, n) {
  return ((k) & (1 << n)) > 0 ? 1 : 0;
}

function CallbackPromise(callback, func) {
  const hasCallback = typeof callback === 'function';
  return new Promise(function (resolve, reject) {
    return func({
      resolve: function (res) {
        if (hasCallback) {
          callback(null, res);
        }
        resolve(res);
      },
      reject: function (err) {
        if (hasCallback) {
          callback(err);
          resolve();
        } else {
          reject(err);
        }
      }
    });
  });
}

// function CallbackPromise(callback, fn) {
//   return Promise(function(resolve, reject) {
//     fn(Resolver(resolve, reject, callback));
//   });
// }

function Resolver(resolve, reject, callback) {
  const hasCallback = typeof callback === 'function';
  return {
    resolve: function(res) {
      if (hasCallback) {
        callback(null, res);
      }
      resolve(res);
    },
    reject: function(err) {
      if (hasCallback) {
        callback(err);
        resolve();
      } else {
        reject(err);
      }
    }
  };
}

module.exports = {
  getBits,
  getBit,
  Resolver,
  CallbackPromise
};