import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { PCCCDataType } from '../../src/layers/pccc/constants.js';
import {
  DecodeDataDescriptor,
  DecodeTypedData,
} from '../../src/layers/pccc/decoding.js';

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
    assert.deepEqual(DecodeDataDescriptor(buffer1, offsetRef), {
      type: PCCCDataType.Array,
      size: 7,
    });
    assert.deepEqual(offsetRef, { current: 2 });

    assert.deepEqual(DecodeDataDescriptor(buffer1, offsetRef), {
      type: PCCCDataType.Integer,
      size: 2,
    });
    assert.deepEqual(offsetRef, { current: 3 });
  });

  test('Extended Integer Array', () => {
    const offsetRef = { current: 0 };
    assert.deepEqual(DecodeDataDescriptor(buffer2, offsetRef), {
      type: PCCCDataType.Array,
      size: 21,
    });
    assert.deepEqual(offsetRef, { current: 4 });
  });
});

describe('DecodeType', () => {
  test('Integer Array', () => {
    const offsetRef = { current: 0 };
    const descriptor = DecodeDataDescriptor(buffer1, offsetRef);
    assert.deepEqual(
      DecodeTypedData(buffer1, offsetRef, descriptor.type, descriptor.size),
      [0, -2, 255],
    );
    assert.deepEqual(offsetRef, { current: buffer1.length });
  });
});
