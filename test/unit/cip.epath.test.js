/* eslint-disable no-undef */

import EPath from '../../src/core/cip/epath/index.js';

describe('EPath Encode', () => {
  test('Logical(ClassID, InstanceID, AttributeID)', () => {
    expect(
      EPath.Encode(true, [
        new EPath.Segments.Logical.ClassID(0x6C),
        new EPath.Segments.Logical.InstanceID(2130),
        new EPath.Segments.Logical.AttributeID(1),
      ]),
    ).toEqual(
      Buffer.from([0x20, 0x6C, 0x25, 0x00, 0x52, 0x08, 0x30, 0x01]),
    );
  });

  test('ANSI Extended Symbol', () => {
    expect(
      EPath.ConvertSymbolToSegments('a.b.c'),
    ).toEqual([
      new EPath.Segments.Data.ANSIExtendedSymbol('a'),
      new EPath.Segments.Data.ANSIExtendedSymbol('b'),
      new EPath.Segments.Data.ANSIExtendedSymbol('c'),
    ]);
  });

  test('ANSI Extended Symbol odd length', () => {
    const symbol = 'R03:2:C';
    expect(symbol.length % 2).toBe(1);
    expect(
      EPath.Encode(true, EPath.ConvertSymbolToSegments(symbol)),
    ).toEqual(
      Buffer.from([0x91, 0x07, 0x52, 0x30, 0x33, 0x3a, 0x32, 0x3a, 0x43, 0x00]),
    );
  });

  test('ANSI Extended Symbol Multiple Symbols', () => {
    expect(
      EPath.Encode(true, EPath.ConvertSymbolToSegments('a.b.c')),
    ).toEqual(
      Buffer.from([0x91, 0x01, 0x61, 0x00, 0x91, 0x01, 0x62, 0x00, 0x91, 0x01, 0x63, 0x00]),
    );
  });
});
