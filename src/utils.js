'use strict';

function getBits(k, m, n) {
  return ((k >> m) & ((1 << (n - m)) - 1));
  // return last(k >> m, n - m);
}

function getBit(k, n) {
  return ((k) & (1 << n)) > 0 ? 1 : 0;
}

module.exports = {
  getBit,
  getBits
};
