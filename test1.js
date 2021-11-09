const result = '127.0.0.1'.split('.').map((v) => parseInt(v, 10)).reduce((accum, v, index) => {
  console.log(v, 8 * (3 - index));
  accum |= v << (8 * (3 - index));
  return accum;
}, 0);

console.log(result);
const transform = (value) => `${value >>> 24}.${(value >>> 16) & 255}.${(value >>> 8) & 255}.${value & 255}`

console.log(transform(2130706433));
