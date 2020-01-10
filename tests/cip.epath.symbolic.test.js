const EPath = require('../src/layers/cip/core/epath');
const Symbolic = EPath.Segments.Symbolic;

describe('Symbolic Single Byte', () => {
  test('Encode 3-byte string', () => {
    expect(new Symbolic.Single('abc').encode()).toEqual(Buffer.from([0x63, 0x61, 0x62, 0x63]));
  });
  test('Encode 4-byte string', () => {
    expect(new Symbolic.Single('abcd').encode()).toEqual(Buffer.from([0x64, 0x61, 0x62, 0x63, 0x64]));
  });

  test('Decode 3-byte string', () => {
    expect(EPath.Decode(Buffer.from([0x63, 0x61, 0x62, 0x63]), 0, true, false, segments => {
      expect(segments).toEqual([new Symbolic.Single('abc')]);
    })).toBe(4);
  });
  test('Decode 4-byte string', () => {
    expect(EPath.Decode(Buffer.from([0x64, 0x61, 0x62, 0x63, 0x64]), 0, true, false, segments => {
      expect(segments).toEqual([new Symbolic.Single('abcd')]);
    })).toBe(5);
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
    expect(new Symbolic.Numeric(65536).encode()).toEqual(Buffer.from([0x60, 0xC8, 0x00, 0x00, 0x01, 0x00]));
  });

  test('Encode Invalid', () => {
    expect(() => new Symbolic.Numeric(0xFFFFFFFFF)).toThrow();
    expect(() => new Symbolic.Numeric(-1)).toThrow();
  });

  test('Decode 8-bit', () => {
    expect(EPath.Decode(Buffer.from([0x60, 0xC6, 0x05]), 0, true, false, segments => {
      expect(segments).toEqual([new Symbolic.Numeric(5)]);
    })).toBe(3);
  });
  test('Decode 16-bit', () => {
    expect(EPath.Decode(Buffer.from([0x60, 0xC7, 0x00, 0x01]), 0, true, false, segments => {
      expect(segments).toEqual([new Symbolic.Numeric(256)]);
    })).toBe(4);
  });
  test('Decode 32-bit', () => {
    expect(EPath.Decode(Buffer.from([0x60, 0xC8, 0x00, 0x00, 0x01, 0x00]), 0, true, false, segments => {
      expect(segments).toEqual([new Symbolic.Numeric(65536)]);
    })).toBe(6);
  });
});


describe('Symbolic Double Byte Characters', () => {
  test('Encode', () => {
    expect(new Symbolic.Double(Buffer.from([0x12, 0x34, 0x23, 0x45])).encode()).toEqual(Buffer.from([0x60, 0x22, 0x12, 0x34, 0x23, 0x45]));
  });

  test('Decode', () => {
    expect(EPath.Decode(Buffer.from([0x60, 0x22, 0x12, 0x34, 0x23, 0x45]), 0, true, false, segments => {
      expect(segments).toEqual([new Symbolic.Double(Buffer.from([0x12, 0x34, 0x23, 0x45]))]);
    })).toBe(6);
  });
});


describe('Symbolic Triple Byte Characters', () => {
  test('Encode', () => {
    expect(new Symbolic.Triple(Buffer.from([0x12, 0x34, 0x56, 0x23, 0x45, 0x67])).encode()).toEqual(Buffer.from([0x60, 0x42, 0x12, 0x34, 0x56, 0x23, 0x45, 0x67]));
  });

  test('Decode', () => {
    expect(EPath.Decode(Buffer.from([0x60, 0x42, 0x12, 0x34, 0x56, 0x23, 0x45, 0x67]), 0, true, false, segments => {
      expect(segments).toEqual([new Symbolic.Triple(Buffer.from([0x12, 0x34, 0x56, 0x23, 0x45, 0x67]))]);
    })).toBe(8);
  });
});