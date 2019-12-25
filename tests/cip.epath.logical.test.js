const EPath = require('../src/layers/cip/EPath');
const Logical = EPath.Segments.Logical;

describe('Logical ClassID', () => {
  test('Padded Implicit 8-bit Format', () => {
    const segment = new Logical.ClassID(1);
    expect(segment.type.code).toBe(Logical.Types.ClassID);
    expect(segment.format.code).toBe(Logical.Formats.Address8Bit);
    expect(segment.encode(true)).toEqual(Buffer.from([0x20, 0x01]));
  });
  test('Packed Implicit 8-bit Format', () => {
    const segment = new Logical.ClassID(1);
    expect(segment.type.code).toBe(Logical.Types.ClassID);
    expect(segment.format.code).toBe(Logical.Formats.Address8Bit);
    expect(segment.encode(false)).toEqual(Buffer.from([0x20, 0x01]));
  });
  test('Padded Implicit 16-bit Format', () => {
    const segment = new Logical.ClassID(256);
    expect(segment.type.code).toBe(Logical.Types.ClassID);
    expect(segment.format.code).toBe(Logical.Formats.Address16Bit);
    expect(segment.encode(true)).toEqual(Buffer.from([0x21, 0x00, 0x00, 0x01]));
  });
  test('Packed Implicit 16-bit Format', () => {
    const segment = new Logical.ClassID(256);
    expect(segment.type.code).toBe(Logical.Types.ClassID);
    expect(segment.format.code).toBe(Logical.Formats.Address16Bit);
    expect(segment.encode(false)).toEqual(Buffer.from([0x21, 0x00, 0x01]));
  });

  test('Padded Explicit 8-bit Format', () => {
    const segment = new Logical.ClassID(1, Logical.Formats.Address8Bit);
    expect(segment.type.code).toBe(Logical.Types.ClassID);
    expect(segment.format.code).toBe(Logical.Formats.Address8Bit);
    expect(segment.encode(true)).toEqual(Buffer.from([0x20, 0x01]));
  });
  test('Packed Explicit 8-bit Format', () => {
    const segment = new Logical.ClassID(1, Logical.Formats.Address8Bit);
    expect(segment.type.code).toBe(Logical.Types.ClassID);
    expect(segment.format.code).toBe(Logical.Formats.Address8Bit);
    expect(segment.encode(false)).toEqual(Buffer.from([0x20, 0x01]));
  });
  test('Padded Explicit 16-bit Format', () => {
    const segment = new Logical.ClassID(256, Logical.Formats.Address16Bit);
    expect(segment.type.code).toBe(Logical.Types.ClassID);
    expect(segment.format.code).toBe(Logical.Formats.Address16Bit);
    expect(segment.encode(true)).toEqual(Buffer.from([0x21, 0x00, 0x00, 0x01]));
  });
  test('Packed Explicit 16-bit Format', () => {
    const segment = new Logical.ClassID(256, Logical.Formats.Address16Bit);
    expect(segment.type.code).toBe(Logical.Types.ClassID);
    expect(segment.format.code).toBe(Logical.Formats.Address16Bit);
    expect(segment.encode(false)).toEqual(Buffer.from([0x21, 0x00, 0x01]));
  });

  test('Padded Explicit 16-bit Format With 8-bit Value', () => {
    const segment = new Logical.ClassID(1, Logical.Formats.Address16Bit);
    expect(segment.type.code).toBe(Logical.Types.ClassID);
    expect(segment.format.code).toBe(Logical.Formats.Address16Bit);
    expect(segment.encode(true)).toEqual(Buffer.from([0x21, 0x00, 0x01, 0x00]));
  });
  test('Packed Explicit 16-bit Format With 8-bit Value', () => {
    const segment = new Logical.ClassID(1, Logical.Formats.Address16Bit);
    expect(segment.type.code).toBe(Logical.Types.ClassID);
    expect(segment.format.code).toBe(Logical.Formats.Address16Bit);
    expect(segment.encode(false)).toEqual(Buffer.from([0x21, 0x01, 0x00]));
  });

  test('Invalid Explicit 32-bit Format With 8-bit Value', () => {
    expect(() => new Logical.ClassID(1, Logical.Formats.Address32Bit)).toThrow();
  });
  test('Invalid Explicit 32-bit Format', () => {
    expect(() => new Logical.ClassID(256, Logical.Formats.Address32Bit)).toThrow();
  });
});


describe('Logical InstanceID', () => {
  test('Padded Implicit 8-bit Format', () => {
    const segment = new Logical.InstanceID(1);
    expect(segment.type.code).toBe(Logical.Types.InstanceID);
    expect(segment.format.code).toBe(Logical.Formats.Address8Bit);
    expect(segment.encode(true)).toEqual(Buffer.from([0x24, 0x01]));
  });
  test('Packed Implicit 8-bit Format', () => {
    const segment = new Logical.InstanceID(1);
    expect(segment.type.code).toBe(Logical.Types.InstanceID);
    expect(segment.format.code).toBe(Logical.Formats.Address8Bit);
    expect(segment.encode(false)).toEqual(Buffer.from([0x24, 0x01]));
  });
  test('Padded Implicit 16-bit Format', () => {
    const segment = new Logical.InstanceID(256);
    expect(segment.type.code).toBe(Logical.Types.InstanceID);
    expect(segment.format.code).toBe(Logical.Formats.Address16Bit);
    expect(segment.encode(true)).toEqual(Buffer.from([0x25, 0x00, 0x00, 0x01]));
  });
  test('Packed Implicit 16-bit Format', () => {
    const segment = new Logical.InstanceID(256);
    expect(segment.type.code).toBe(Logical.Types.InstanceID);
    expect(segment.format.code).toBe(Logical.Formats.Address16Bit);
    expect(segment.encode(false)).toEqual(Buffer.from([0x25, 0x00, 0x01]));
  });
  test('Padded Implicit 32-bit Format', () => {
    const segment = new Logical.InstanceID(0x10000);
    expect(segment.type.code).toBe(Logical.Types.InstanceID);
    expect(segment.format.code).toBe(Logical.Formats.Address32Bit);
    expect(segment.encode(true)).toEqual(Buffer.from([0x26, 0x00, 0x00, 0x00, 0x01, 0x00]));
  });
  test('Packed Implicit 32-bit Format', () => {
    const segment = new Logical.InstanceID(0x10000);
    expect(segment.type.code).toBe(Logical.Types.InstanceID);
    expect(segment.format.code).toBe(Logical.Formats.Address32Bit);
    expect(segment.encode(false)).toEqual(Buffer.from([0x26, 0x00, 0x00, 0x01, 0x00]));
  });

  test('Padded Explicit 8-bit Format', () => {
    const segment = new Logical.InstanceID(1, Logical.Formats.Address8Bit);
    expect(segment.type.code).toBe(Logical.Types.InstanceID);
    expect(segment.format.code).toBe(Logical.Formats.Address8Bit);
    expect(segment.encode(true)).toEqual(Buffer.from([0x24, 0x01]));
  });
  test('Packed Explicit 8-bit Format', () => {
    const segment = new Logical.InstanceID(1, Logical.Formats.Address8Bit);
    expect(segment.type.code).toBe(Logical.Types.InstanceID);
    expect(segment.format.code).toBe(Logical.Formats.Address8Bit);
    expect(segment.encode(false)).toEqual(Buffer.from([0x24, 0x01]));
  });
  test('Padded Explicit 16-bit Format', () => {
    const segment = new Logical.InstanceID(256, Logical.Formats.Address16Bit);
    expect(segment.type.code).toBe(Logical.Types.InstanceID);
    expect(segment.format.code).toBe(Logical.Formats.Address16Bit);
    expect(segment.encode(true)).toEqual(Buffer.from([0x25, 0x00, 0x00, 0x01]));
  });
  test('Packed Explicit 16-bit Format', () => {
    const segment = new Logical.InstanceID(256, Logical.Formats.Address16Bit);
    expect(segment.type.code).toBe(Logical.Types.InstanceID);
    expect(segment.format.code).toBe(Logical.Formats.Address16Bit);
    expect(segment.encode(false)).toEqual(Buffer.from([0x25, 0x00, 0x01]));
  });
  test('Padded Explicit 32-bit Format', () => {
    const segment = new Logical.InstanceID(0x10000, Logical.Formats.Address32Bit);
    expect(segment.type.code).toBe(Logical.Types.InstanceID);
    expect(segment.format.code).toBe(Logical.Formats.Address32Bit);
    expect(segment.encode(true)).toEqual(Buffer.from([0x26, 0x00, 0x00, 0x00, 0x01, 0x00]));
  });
  test('Packed Explicit 32-bit Format', () => {
    const segment = new Logical.InstanceID(0x10000, Logical.Formats.Address32Bit);
    expect(segment.type.code).toBe(Logical.Types.InstanceID);
    expect(segment.format.code).toBe(Logical.Formats.Address32Bit);
    expect(segment.encode(false)).toEqual(Buffer.from([0x26, 0x00, 0x00, 0x01, 0x00]));
  });

  test('Padded Explicit 16-bit Format With 8-bit Value', () => {
    const segment = new Logical.InstanceID(1, Logical.Formats.Address16Bit);
    expect(segment.type.code).toBe(Logical.Types.InstanceID);
    expect(segment.format.code).toBe(Logical.Formats.Address16Bit);
    expect(segment.encode(true)).toEqual(Buffer.from([0x25, 0x00, 0x01, 0x00]));
  });
  test('Packed Explicit 16-bit Format With 8-bit Value', () => {
    const segment = new Logical.InstanceID(1, Logical.Formats.Address16Bit);
    expect(segment.type.code).toBe(Logical.Types.InstanceID);
    expect(segment.format.code).toBe(Logical.Formats.Address16Bit);
    expect(segment.encode(false)).toEqual(Buffer.from([0x25, 0x01, 0x00]));
  });
  test('Padded Explicit 32-bit Format With 8-bit Value', () => {
    const segment = new Logical.InstanceID(1, Logical.Formats.Address32Bit);
    expect(segment.type.code).toBe(Logical.Types.InstanceID);
    expect(segment.format.code).toBe(Logical.Formats.Address32Bit);
    expect(segment.encode(true)).toEqual(Buffer.from([0x26, 0x00, 0x01, 0x00, 0x00, 0x00]));
  });
  test('Packed Explicit 32-bit Format With 8-bit Value', () => {
    const segment = new Logical.InstanceID(1, Logical.Formats.Address32Bit);
    expect(segment.type.code).toBe(Logical.Types.InstanceID);
    expect(segment.format.code).toBe(Logical.Formats.Address32Bit);
    expect(segment.encode(false)).toEqual(Buffer.from([0x26, 0x01, 0x00, 0x00, 0x00]));
  });
  test('Padded Explicit 32-bit Format With 16-bit Value', () => {
    const segment = new Logical.InstanceID(1, Logical.Formats.Address32Bit);
    expect(segment.type.code).toBe(Logical.Types.InstanceID);
    expect(segment.format.code).toBe(Logical.Formats.Address32Bit);
    expect(segment.encode(true)).toEqual(Buffer.from([0x26, 0x00, 0x01, 0x00, 0x00, 0x00]));
  });
  test('Packed Explicit 32-bit Format With 16-bit Value', () => {
    const segment = new Logical.InstanceID(1, Logical.Formats.Address32Bit);
    expect(segment.type.code).toBe(Logical.Types.InstanceID);
    expect(segment.format.code).toBe(Logical.Formats.Address32Bit);
    expect(segment.encode(false)).toEqual(Buffer.from([0x26, 0x01, 0x00, 0x00, 0x00]));
  });
});


describe('Logical AttributeID', () => {
  test('Padded Implicit 8-bit Format', () => {
    const segment = new Logical.AttributeID(1);
    expect(segment.type.code).toBe(Logical.Types.AttributeID);
    expect(segment.format.code).toBe(Logical.Formats.Address8Bit);
    expect(segment.encode(true)).toEqual(Buffer.from([0x30, 0x01]));
  });
  test('Packed Implicit 8-bit Format', () => {
    const segment = new Logical.AttributeID(1);
    expect(segment.type.code).toBe(Logical.Types.AttributeID);
    expect(segment.format.code).toBe(Logical.Formats.Address8Bit);
    expect(segment.encode(false)).toEqual(Buffer.from([0x30, 0x01]));
  });
  test('Padded Implicit 16-bit Format', () => {
    const segment = new Logical.AttributeID(256);
    expect(segment.type.code).toBe(Logical.Types.AttributeID);
    expect(segment.format.code).toBe(Logical.Formats.Address16Bit);
    expect(segment.encode(true)).toEqual(Buffer.from([0x31, 0x00, 0x00, 0x01]));
  });
  test('Packed Implicit 16-bit Format', () => {
    const segment = new Logical.AttributeID(256);
    expect(segment.type.code).toBe(Logical.Types.AttributeID);
    expect(segment.format.code).toBe(Logical.Formats.Address16Bit);
    expect(segment.encode(false)).toEqual(Buffer.from([0x31, 0x00, 0x01]));
  });

  test('Padded Explicit 8-bit Format', () => {
    const segment = new Logical.AttributeID(1, Logical.Formats.Address8Bit);
    expect(segment.type.code).toBe(Logical.Types.AttributeID);
    expect(segment.format.code).toBe(Logical.Formats.Address8Bit);
    expect(segment.encode(true)).toEqual(Buffer.from([0x30, 0x01]));
  });
  test('Packed Explicit 8-bit Format', () => {
    const segment = new Logical.AttributeID(1, Logical.Formats.Address8Bit);
    expect(segment.type.code).toBe(Logical.Types.AttributeID);
    expect(segment.format.code).toBe(Logical.Formats.Address8Bit);
    expect(segment.encode(false)).toEqual(Buffer.from([0x30, 0x01]));
  });
  test('Padded Explicit 16-bit Format', () => {
    const segment = new Logical.AttributeID(256, Logical.Formats.Address16Bit);
    expect(segment.type.code).toBe(Logical.Types.AttributeID);
    expect(segment.format.code).toBe(Logical.Formats.Address16Bit);
    expect(segment.encode(true)).toEqual(Buffer.from([0x31, 0x00, 0x00, 0x01]));
  });
  test('Packed Explicit 16-bit Format', () => {
    const segment = new Logical.AttributeID(256, Logical.Formats.Address16Bit);
    expect(segment.type.code).toBe(Logical.Types.AttributeID);
    expect(segment.format.code).toBe(Logical.Formats.Address16Bit);
    expect(segment.encode(false)).toEqual(Buffer.from([0x31, 0x00, 0x01]));
  });

  test('Padded Explicit 16-bit Format With 8-bit Value', () => {
    const segment = new Logical.AttributeID(1, Logical.Formats.Address16Bit);
    expect(segment.type.code).toBe(Logical.Types.AttributeID);
    expect(segment.format.code).toBe(Logical.Formats.Address16Bit);
    expect(segment.encode(true)).toEqual(Buffer.from([0x31, 0x00, 0x01, 0x00]));
  });
  test('Packed Explicit 16-bit Format With 8-bit Value', () => {
    const segment = new Logical.AttributeID(1, Logical.Formats.Address16Bit);
    expect(segment.type.code).toBe(Logical.Types.AttributeID);
    expect(segment.format.code).toBe(Logical.Formats.Address16Bit);
    expect(segment.encode(false)).toEqual(Buffer.from([0x31, 0x01, 0x00]));
  });

  test('Invalid Explicit 32-bit Format With 8-bit Value', () => {
    expect(() => new Logical.AttributeID(1, Logical.Formats.Address32Bit)).toThrow();
  });
  test('Invalid Explicit 32-bit Format With 16-bit Value', () => {
    expect(() => new Logical.AttributeID(256, Logical.Formats.Address32Bit)).toThrow();
  });
});