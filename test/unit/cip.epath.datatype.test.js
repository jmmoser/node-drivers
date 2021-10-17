const { DataTypeCodes, DataType } = require('../../src/layers/cip/core/datatypes');
const EPath = require('../../src/layers/cip/core/epath');

const { DataType: DataTypeSegment } = EPath.Segments;

describe('Encoding', () => {
  test('Encode INT code', () => {
    expect(
      new DataTypeSegment(DataTypeCodes.INT).encode(),
    ).toEqual(Buffer.from([DataTypeCodes.INT]));
  });

  test('Encode INT type function', () => {
    expect(
      new DataTypeSegment(DataType.INT).encode(),
    ).toEqual(Buffer.from([DataTypeCodes.INT]));
  });

  test('Encode INT type object', () => {
    expect(new DataTypeSegment(DataType.INT()).encode()).toEqual(Buffer.from([DataTypeCodes.INT]));
  });

  test('Encode STRUCT', () => {
    expect(
      new DataTypeSegment(DataType.STRUCT([DataType.BOOL, DataType.UINT, DataType.DINT])).encode(),
    ).toEqual(Buffer.from([0xA2, 0x03, 0xC1, 0xC7, 0xC4]));
  });

  test('Encode ARRAY', () => {
    expect(
      new DataTypeSegment(DataType.ARRAY(DataType.UINT, 0, 9, 0xC7, 0x81)).encode(),
    ).toEqual(Buffer.from([0xA3, 0x07, 0xC7, 0x01, 0x00, 0x81, 0x01, 0x09, 0xC7]));
  });

  test('Encode ABBREV_STRUCT', () => {
    expect(
      new DataTypeSegment(DataType.ABBREV_STRUCT(0x26C7)).encode(),
    ).toEqual(Buffer.from([0xA0, 0x02, 0xC7, 0x26]));
  });

  test('Encode ABBREV_ARRAY', () => {
    expect(
      new DataTypeSegment(DataType.ABBREV_ARRAY(DataType.UINT)).encode(),
    ).toEqual(Buffer.from([0xA1, 0x01, 0xC7]));
  });
});

describe('Decoding', () => {
  test('Decode STRUCT', () => {
    expect(EPath.Decode(Buffer.from([0xA2, 0x03, 0xC1, 0xC7, 0xC4]), 0, true, false, (segments) => {
      expect(segments).toEqual([
        new DataTypeSegment(DataType.STRUCT([DataType.BOOL, DataType.UINT, DataType.DINT])),
      ]);
    })).toBe(5);
  });
  test('Decode ARRAY', () => {
    const buffer = Buffer.from([0xA3, 0x07, 0xC7, 0x01, 0x00, 0x81, 0x01, 0x09, 0xC7]);
    expect(EPath.Decode(buffer, 0, true, false, (segments) => {
      expect(segments).toEqual([
        new DataTypeSegment(DataType.ARRAY(DataType.UINT, 0, 9, 0xC7, 0x81)),
      ]);
    })).toBe(9);
  });
  test('Decode ABBREV_STRUCT', () => {
    expect(EPath.Decode(Buffer.from([0xA0, 0x02, 0xC7, 0x26]), 0, true, false, (segments) => {
      expect(segments).toEqual([new DataTypeSegment(DataType.ABBREV_STRUCT(0x26C7))]);
    })).toBe(4);
  });
  test('Decode ABBREV_ARRAY', () => {
    expect(EPath.Decode(Buffer.from([0xA1, 0x01, 0xC7]), 0, true, false, (segments) => {
      expect(segments).toEqual([new DataTypeSegment(DataType.ABBREV_ARRAY(DataType.UINT))]);
    })).toBe(3);
  });
});
