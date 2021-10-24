/* eslint-disable no-undef */

const { PCCCDataType } = require('../../src/layers/pccc/constants');
const {
  DecodeDataDescriptor,
  DecodeTypedData,
} = require('../../src/layers/pccc/decoding');

const buffer1 = Buffer.from([
  0b10010111,
  0b00001001,
  0b01000010,
  0b00000000,
  0b00000000,
  0b11111110,
  0b11111111,
  0b11111111,
  0b00000000,
]);

const buffer2 = Buffer.from([
  0b10011010,
  0b00001001,
  0b00010101,
  0b00000000,
  0b01000010,
  // ...
]);

describe('DecodeDataDescriptor', () => {
  test('Integer Array', () => {
    const offsetRef = { current: 0 };
    expect(DecodeDataDescriptor(buffer1, offsetRef)).toStrictEqual({
      type: PCCCDataType.Array,
      size: 7,
    });
    expect(offsetRef).toStrictEqual({ current: 2 });

    expect(DecodeDataDescriptor(buffer1, offsetRef)).toStrictEqual({
      type: PCCCDataType.Integer,
      size: 2,
    });
    expect(offsetRef).toStrictEqual({ current: 3 });
  });

  test('Extended Integer Array', () => {
    const offsetRef = { current: 0 };
    expect(DecodeDataDescriptor(buffer2, offsetRef)).toStrictEqual({
      type: PCCCDataType.Array,
      size: 21,
    });
    expect(offsetRef).toStrictEqual({ current: 4 });
  });
});

describe('DecodeType', () => {
  test('Integer Array', () => {
    const offsetRef = { current: 0 };
    const descriptor = DecodeDataDescriptor(buffer1, offsetRef);
    expect(
      DecodeTypedData(buffer1, offsetRef, descriptor.type, descriptor.size),
    ).toStrictEqual(
      [0, -2, 255],
    );
    expect(offsetRef).toStrictEqual({ current: buffer1.length });
  });
});
