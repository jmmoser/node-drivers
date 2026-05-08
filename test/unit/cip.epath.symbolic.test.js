import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import EPath from '../../src/layers/cip/core/epath/index.js';

const { Symbolic } = EPath.Segments;

describe('Symbolic Single Byte', () => {
  test('Encode 3-byte string', () => {
    assert.deepEqual(new Symbolic.Single('abc').encode(), Buffer.from([0x63, 0x61, 0x62, 0x63]));
  });
  test('Encode 4-byte string', () => {
    assert.deepEqual(new Symbolic.Single('abcd').encode(), Buffer.from([0x64, 0x61, 0x62, 0x63, 0x64]));
  });

  test('Decode 3-byte string', () => {
    const offsetRef = { current: 0 };
    const buffer = Buffer.from([0x63, 0x61, 0x62, 0x63]);
    const output = [
      new Symbolic.Single('abc'),
    ];
    assert.deepEqual(EPath.Decode(buffer, offsetRef, true, false), output);
    assert.equal(offsetRef.current, 4);
  });
  test('Decode 4-byte string', () => {
    const offsetRef = { current: 0 };
    const buffer = Buffer.from([0x64, 0x61, 0x62, 0x63, 0x64]);
    const output = [
      new Symbolic.Single('abcd'),
    ];
    assert.deepEqual(EPath.Decode(buffer, offsetRef, true, false), output);
    assert.equal(offsetRef.current, 5);
  });
});

describe('Symbolic Numeric', () => {
  test('Encode 8-bit', () => {
    assert.deepEqual(new Symbolic.Numeric(5).encode(), Buffer.from([0x60, 0xC6, 0x05]));
  });
  test('Encode 16-bit', () => {
    assert.deepEqual(new Symbolic.Numeric(256).encode(), Buffer.from([0x60, 0xC7, 0x00, 0x01]));
  });
  test('Encode 32-bit', () => {
    assert.deepEqual(
      new Symbolic.Numeric(65536).encode(),
      Buffer.from([0x60, 0xC8, 0x00, 0x00, 0x01, 0x00]),
    );
  });

  test('Encode Invalid', () => {
    assert.throws(() => new Symbolic.Numeric(0xFFFFFFFFF));
    assert.throws(() => new Symbolic.Numeric(-1));
  });

  test('Decode 8-bit', () => {
    const offsetRef = { current: 0 };
    const buffer = Buffer.from([0x60, 0xC6, 0x05]);
    const output = [
      new Symbolic.Numeric(5),
    ];
    assert.deepEqual(EPath.Decode(buffer, offsetRef, true, false), output);
    assert.equal(offsetRef.current, 3);
  });
  test('Decode 16-bit', () => {
    const offsetRef = { current: 0 };
    const buffer = Buffer.from([0x60, 0xC7, 0x00, 0x01]);
    const output = [
      new Symbolic.Numeric(256),
    ];
    assert.deepEqual(EPath.Decode(buffer, offsetRef, true, false), output);
    assert.equal(offsetRef.current, 4);
  });
  test('Decode 32-bit', () => {
    const offsetRef = { current: 0 };
    const buffer = Buffer.from([0x60, 0xC8, 0x00, 0x00, 0x01, 0x00]);
    const output = [
      new Symbolic.Numeric(65536),
    ];
    assert.deepEqual(EPath.Decode(buffer, offsetRef, true, false), output);
    assert.equal(offsetRef.current, 6);
  });
});

describe('Symbolic Double Byte Characters', () => {
  test('Encode', () => {
    assert.deepEqual(
      new Symbolic.Double(Buffer.from([0x12, 0x34, 0x23, 0x45])).encode(),
      Buffer.from([0x60, 0x22, 0x12, 0x34, 0x23, 0x45]),
    );
  });

  test('Decode', () => {
    const offsetRef = { current: 0 };
    const buffer = Buffer.from([0x60, 0x22, 0x12, 0x34, 0x23, 0x45]);
    const output = [
      new Symbolic.Double(Buffer.from([0x12, 0x34, 0x23, 0x45])),
    ];
    assert.deepEqual(EPath.Decode(buffer, offsetRef, true, false), output);
    assert.equal(offsetRef.current, 6);
  });
});

describe('Symbolic Triple Byte Characters', () => {
  test('Encode', () => {
    assert.deepEqual(
      new Symbolic.Triple(Buffer.from([0x12, 0x34, 0x56, 0x23, 0x45, 0x67])).encode(),
      Buffer.from([0x60, 0x42, 0x12, 0x34, 0x56, 0x23, 0x45, 0x67]),
    );
  });

  test('Decode', () => {
    const offsetRef = { current: 0 };
    const buffer = Buffer.from([0x60, 0x42, 0x12, 0x34, 0x56, 0x23, 0x45, 0x67]);
    const output = [
      new Symbolic.Triple(Buffer.from([0x12, 0x34, 0x56, 0x23, 0x45, 0x67])),
    ];
    assert.deepEqual(EPath.Decode(buffer, offsetRef, true, false), output);
    assert.equal(offsetRef.current, 8);
  });
});
