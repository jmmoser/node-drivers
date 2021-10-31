/* eslint-disable no-undef */

import EPath from '../../src/core/cip/epath/index.js';

const { Data } = EPath.Segments;

describe('Simple Data Segment', () => {
  test('Encode', () => {
    expect(
      new Data.Simple(Buffer.from([0x01, 0x00, 0x02, 0x00])).encode(),
    ).toEqual(Buffer.from([0x80, 0x02, 0x01, 0x00, 0x02, 0x00]));
  });
  test('Invalid Encode', () => {
    expect(() => new Data.Simple(Buffer.from([0x01, 0x00, 0x02]))).toThrow();
    expect(() => new Data.Simple(1)).toThrow();

    expect(() => {
      const segment = new Data.Simple(Buffer.from([0x01, 0x00, 0x02, 0x00]));
      const buffer = Buffer.alloc(5);
      segment.encodeTo(buffer, 0);
    }).toThrow();
  });

  test('Decode', () => {
    const offsetRef = { current: 0 };
    const buffer = Buffer.from([0x80, 0x02, 0x01, 0x00, 0x02, 0x00]);
    const output = [new Data.Simple(Buffer.from([0x01, 0x00, 0x02, 0x00]))];
    expect(EPath.Decode(buffer, offsetRef, true, false)).toStrictEqual(output);
    expect(offsetRef.current).toBe(6);
  });
  test('Invalid Decode', () => {
    const offsetRef = { current: 0 };
    const buffer = Buffer.from([0x80, 0x02, 0x01, 0x00, 0x02]);
    expect(
      () => EPath.Decode(buffer, offsetRef, true, false, () => {}),
    ).toThrow();
  });
});

describe('ANSI Extended Symbol Data Segment', () => {
  test('Encode Single Character', () => {
    expect(new Data.ANSIExtendedSymbol('a').encode()).toEqual(Buffer.from([0x91, 0x01, 0x61, 0x00]));
  });
  test('Encode', () => {
    expect(new Data.ANSIExtendedSymbol('start1').encode()).toEqual(Buffer.from([0x91, 0x06, 0x73, 0x74, 0x61, 0x72, 0x74, 0x31]));
  });
  test('Encode With Pad Byte', () => {
    expect(new Data.ANSIExtendedSymbol('start').encode()).toEqual(Buffer.from([0x91, 0x05, 0x73, 0x74, 0x61, 0x72, 0x74, 0x00]));
  });
  test('Invalid Encode', () => {
    expect(() => new Data.ANSIExtendedSymbol(Buffer.from([0x01, 0x00, 0x02]))).toThrow();
    expect(() => new Data.ANSIExtendedSymbol('')).toThrow();
  });

  test('Decode', () => {
    const offsetRef = { current: 0 };
    const buffer = Buffer.from([0x91, 0x06, 0x73, 0x74, 0x61, 0x72, 0x74, 0x31]);
    const output = [new Data.ANSIExtendedSymbol('start1')];
    expect(EPath.Decode(buffer, offsetRef, true, false)).toStrictEqual(output);
    expect(offsetRef.current).toBe(8);
  });
  test('Decode With Pad Byte', () => {
    const offsetRef = { current: 0 };
    const buffer = Buffer.from([0x91, 0x05, 0x73, 0x74, 0x61, 0x72, 0x74, 0x00]);
    const output = [new Data.ANSIExtendedSymbol('start')];
    expect(EPath.Decode(buffer, offsetRef, true, false)).toStrictEqual(output);
    expect(offsetRef.current).toBe(8);
  });
  test('Invalid Decode', () => {
    /** Pad byte must be 0x00 */
    const offsetRef = { current: 0 };
    expect(
      () => EPath.Decode(Buffer.from([
        0x91, 0x05, 0x73, 0x74,
        0x61, 0x72, 0x74, 0x01,
      ]), offsetRef, true, false, () => {}),
    ).toThrow();
    /** Invalid length */

    offsetRef.current = 0;
    expect(
      () => EPath.Decode(Buffer.from([
        0x91, 0x06, 0x73, 0x74, 0x61, 0x72, 0x74,
      ]), offsetRef, true, false, () => { }),
    ).toThrow();
  });
});

describe('Data Segment', () => {
  test('Invalid Subtype', () => {
    expect(() => new Data(-1, 1)).toThrow();

    const offsetRef = { current: 0 };
    expect(
      () => EPath.Decode(Buffer.from([
        0x81, 0x02, 0x01, 0x00, 0x02, 0x00,
      ]), offsetRef, true, false, () => { }),
    ).toThrow();
  });
});
