'use strict';

// http://stackoverflow.com/a/10090443/3055415
function getBits(k, m, n) {
  return ((k >> m) & ((1 << (n - m)) - 1));
}

function getBit(k, n) {
  return ((k) & (1 << n)) > 0 ? 1 : 0;
}

function CallbackPromise(callback, func, timeout) {
  const hasCallback = typeof callback === 'function';
  return new Promise(function (resolve, reject) {
    let timeoutHandle;
    let active = true;
    const resolver = {
      resolve: function (res) {
        if (active) {
          active = false;
          clearInterval(timeoutHandle);
          if (hasCallback) {
            callback(null, res);
          }
          resolve(res);
        }
      },
      reject: function (err) {
        if (active) {
          active = false;
          clearInterval(timeoutHandle);
          if (hasCallback) {
            callback(err);
            resolve();
          } else {
            reject(err);
          }
        }
      }
    };

    if (typeof timeout === 'number' && timeout >= 0) {
      timeoutHandle = setTimeout(function() {
        console.log('TIMED OUT!!!')
        resolver.reject({ message: 'Timeout' });
      }, parseInt(number, 10));
    }

    return func(resolver);
  });
}

// function CallbackPromise(callback, func) {
//   const hasCallback = typeof callback === 'function';
//   return new Promise(function (resolve, reject) {
//     return func({
//       resolve: function (res) {
//         if (hasCallback) {
//           callback(null, res);
//         }
//         resolve(res);
//       },
//       reject: function (err) {
//         if (hasCallback) {
//           callback(err);
//           resolve();
//         } else {
//           reject(err);
//         }
//       }
//     });
//   });
// }

module.exports = {
  getBits,
  getBit,
  CallbackPromise
};