const EPath = require('../src/layers/cip/objects/EPath');
const Symbolic = EPath.Segments.Symbolic;

describe('Symbolic Single Byte', () => {
  test('Encode', () => {
    expect(new Symbolic.Single('abc').encode()).toEqual(Buffer.from([0x63, 0x61, 0x62, 0x63]));
  });
  test('Decode', () => {
    expect(EPath.Decode(Buffer.from([0x63, 0x61, 0x62, 0x63]), 0, true, false, segments => {
      expect(segments).toEqual([new Symbolic.Single('abc')]);
    })).toBe(4);
  })
});