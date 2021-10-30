/* eslint-disable no-undef */

const EPath = require('../../src/layers/cip/core/epath');

const { Symbolic } = EPath.Segments;

describe('Symbolic Single Byte', () => {
  test('Encode 3-byte string', () => {
    expect(new Symbolic.Single('abc').encode()).toEqual(Buffer.from([0x63, 0x61, 0x62, 0x63]));
  });
  test('Encode 4-byte string', () => {
    expect(new Symbolic.Single('abcd').encode()).toEqual(Buffer.from([0x64, 0x61, 0x62, 0x63, 0x64]));
  });

  test('Decode 3-byte string', () => {
    const offsetRef = { current: 0 };
    const buffer = Buffer.from([0x63, 0x61, 0x62, 0x63]);
    const output = [
      new Symbolic.Single('abc'),
    ];
    expect(EPath.Decode(buffer, offsetRef, true, false)).toStrictEqual(output);
    expect(offsetRef.current).toBe(4);
  });
  test('Decode 4-byte string', () => {
    const offsetRef = { current: 0 };
    const buffer = Buffer.from([0x64, 0x61, 0x62, 0x63, 0x64]);
    const output = [
      new Symbolic.Single('abcd'),
    ];
    expect(EPath.Decode(buffer, offsetRef, true, false)).toStrictEqual(output);
    expect(offsetRef.current).toBe(5);
  });
});

describe('Symbolic Numeric', () => {
  test('Encode 8-bit', () => {
    expect(new Symbolic.Numeric(5).encode()).toEqual(Buffer.from([0x60, 0xC6, 0x05]));
  });
  test('Encode 16-bit', () => {
    expect(new Symbolic.Numeric(256).encode()).toEqual(Buffer.from([0x60, 0xC7, 0x00, 0x01]));
  });
  test('Encode 32-bit', () => {
    expect(
      new Symbolic.Numeric(65536).encode(),
    ).toEqual(
      Buffer.from([0x60, 0xC8, 0x00, 0x00, 0x01, 0x00]),
    );
  });

  test('Encode Invalid', () => {
    expect(() => new Symbolic.Numeric(0xFFFFFFFFF)).toThrow();
    expect(() => new Symbolic.Numeric(-1)).toThrow();
  });

  test('Decode 8-bit', () => {
    const offsetRef = { current: 0 };
    const buffer = Buffer.from([0x60, 0xC6, 0x05]);
    const output = [
      new Symbolic.Numeric(5),
    ];
    expect(EPath.Decode(buffer, offsetRef, true, false)).toStrictEqual(output);
    expect(offsetRef.current).toBe(3);
  });
  test('Decode 16-bit', () => {
    const offsetRef = { current: 0 };
    const buffer = Buffer.from([0x60, 0xC7, 0x00, 0x01]);
    const output = [
      new Symbolic.Numeric(256),
    ];
    expect(EPath.Decode(buffer, offsetRef, true, false)).toStrictEqual(output);
    expect(offsetRef.current).toBe(4);
  });
  test('Decode 32-bit', () => {
    const offsetRef = { current: 0 };
    const buffer = Buffer.from([0x60, 0xC8, 0x00, 0x00, 0x01, 0x00]);
    const output = [
      new Symbolic.Numeric(65536),
    ];
    expect(EPath.Decode(buffer, offsetRef, true, false)).toStrictEqual(output);
    expect(offsetRef.current).toBe(6);
  });
});

describe('Symbolic Double Byte Characters', () => {
  test('Encode', () => {
    expect(
      new Symbolic.Double(Buffer.from([0x12, 0x34, 0x23, 0x45])).encode(),
    ).toEqual(Buffer.from([0x60, 0x22, 0x12, 0x34, 0x23, 0x45]));
  });

  test('Decode', () => {
    const offsetRef = { current: 0 };
    const buffer = Buffer.from([0x60, 0x22, 0x12, 0x34, 0x23, 0x45]);
    const output = [
      new Symbolic.Double(Buffer.from([0x12, 0x34, 0x23, 0x45])),
    ];
    expect(EPath.Decode(buffer, offsetRef, true, false)).toStrictEqual(output);
    expect(offsetRef.current).toBe(6);
  });
});

describe('Symbolic Triple Byte Characters', () => {
  test('Encode', () => {
    expect(
      new Symbolic.Triple(Buffer.from([0x12, 0x34, 0x56, 0x23, 0x45, 0x67])).encode(),
    ).toEqual(Buffer.from([0x60, 0x42, 0x12, 0x34, 0x56, 0x23, 0x45, 0x67]));
  });

  test('Decode', () => {
    const offsetRef = { current: 0 };
    const buffer = Buffer.from([0x60, 0x42, 0x12, 0x34, 0x56, 0x23, 0x45, 0x67]);
    const output = [
      new Symbolic.Triple(Buffer.from([0x12, 0x34, 0x56, 0x23, 0x45, 0x67])),
    ];
    expect(EPath.Decode(buffer, offsetRef, true, false)).toStrictEqual(output);
    expect(offsetRef.current).toBe(8);
  });
});
