const EPath = require('../src/layers/cip/objects/EPath');


describe('EPath Encode', () => {
  test('Logical(ClassID, InstanceID, AttributeID)', () => {
    expect(EPath.Encode(true, [
      new EPath.Segments.Logical.ClassID(0x6C),
      new EPath.Segments.Logical.InstanceID(2130),
      new EPath.Segments.Logical.AttributeID(1)
    ])).toEqual(Buffer.from([0x20, 0x6C, 0x25, 0x00, 0x52, 0x08, 0x30, 0x01]));
  });

  // test('ANSI Extended Symbol odd length', () => {
  //   const symbol = 'R03:2:C';
  //   expect(symbol.length % 2).toBe(1);
  //   expect(EPath.Encode(
  //     true,
  //     EPath.ConvertSymbolToSegments(symbol)
  //   )).toEqual(EPath.EncodeANSIExtSymbol(symbol))
  // });
});