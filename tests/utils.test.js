const {
  getBit,
  getBits
} = require('../src/utils');

describe('getBit', () => {
  test('getBit', () => {
    expect(getBit(0, 0)).toBe(0);
    expect(getBit(1, 0)).toBe(1);
    expect(getBit(1, 1)).toBe(0);
    expect(getBit(-1, 0)).toBe(1);
  });
})

describe('getBits', () => {
  test('getBits', () => {
    expect(getBits(0, 0, 1)).toBe(0);
    expect(getBits(0, 0, 2)).toBe(0);
    expect(getBits(0, 3, 8)).toBe(0);
    expect(getBits(0b00001111, 0, 1)).toBe(1);
    expect(getBits(1, 0, 1)).toBe(1);
    expect(getBits(1, 2, 9)).toBe(0);
    expect(getBits(1, 0, 2)).toBe(1);
    expect(getBits(-1, 0, 1)).toBe(1);
    expect(getBits(2, 0, 1)).toBe(0);
    expect(getBits(2, 0, 2)).toBe(2);
  });
});