import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { DataTypeCodes, DataType } from '../../src/layers/cip/core/datatypes/index.js';
import EPath from '../../src/layers/cip/core/epath/index.js';

const { DataType: DataTypeSegment } = EPath.Segments;

describe('Encoding', () => {
  test('Encode INT code', () => {
    assert.deepEqual(
      new DataTypeSegment(DataTypeCodes.INT).encode(),
      Buffer.from([DataTypeCodes.INT]),
    );
  });

  test('Encode INT type function', () => {
    assert.deepEqual(
      new DataTypeSegment(DataType.INT).encode(),
      Buffer.from([DataTypeCodes.INT]),
    );
  });

  test('Encode INT type object', () => {
    assert.deepEqual(new DataTypeSegment(DataType.INT()).encode(), Buffer.from([DataTypeCodes.INT]));
  });

  test('Encode STRUCT', () => {
    assert.deepEqual(
      new DataTypeSegment(DataType.STRUCT([DataType.BOOL, DataType.UINT, DataType.DINT])).encode(),
      Buffer.from([0xA2, 0x03, 0xC1, 0xC7, 0xC4]),
    );
  });

  test('Encode ARRAY', () => {
    assert.deepEqual(
      new DataTypeSegment(DataType.ARRAY(DataType.UINT, 0, 9, 0xC7, 0x81)).encode(),
      Buffer.from([0xA3, 0x07, 0xC7, 0x01, 0x00, 0x81, 0x01, 0x09, 0xC7]),
    );
  });

  test('Encode ABBREV_STRUCT', () => {
    assert.deepEqual(
      new DataTypeSegment(DataType.ABBREV_STRUCT(0x26C7)).encode(),
      Buffer.from([0xA0, 0x02, 0xC7, 0x26]),
    );
  });

  test('Encode ABBREV_ARRAY', () => {
    assert.deepEqual(
      new DataTypeSegment(DataType.ABBREV_ARRAY(DataType.UINT)).encode(),
      Buffer.from([0xA1, 0x01, 0xC7]),
    );
  });
});

describe('Decoding', () => {
  test('Decode STRUCT', () => {
    const offsetRef = { current: 0 };
    const buffer = Buffer.from([0xA2, 0x03, 0xC1, 0xC7, 0xC4]);
    const output = [
      new DataTypeSegment(DataType.STRUCT([DataType.BOOL, DataType.UINT, DataType.DINT])),
    ];
    assert.deepEqual(EPath.Decode(buffer, offsetRef, true, false), output);
    assert.equal(offsetRef.current, 5);
  });
  test('Decode ARRAY', () => {
    const offsetRef = { current: 0 };
    const buffer = Buffer.from([0xA3, 0x07, 0xC7, 0x01, 0x00, 0x81, 0x01, 0x09, 0xC7]);
    const output = [
      new DataTypeSegment(DataType.ARRAY(DataType.UINT, 0, 9, 0xC7, 0x81)),
    ];
    assert.deepEqual(EPath.Decode(buffer, offsetRef, true, false), output);
    assert.equal(offsetRef.current, 9);
  });
  test('Decode ABBREV_STRUCT', () => {
    const offsetRef = { current: 0 };
    const buffer = Buffer.from([0xA0, 0x02, 0xC7, 0x26]);
    const output = [
      new DataTypeSegment(DataType.ABBREV_STRUCT(0x26C7)),
    ];
    assert.deepEqual(EPath.Decode(buffer, offsetRef, true, false), output);
    assert.equal(offsetRef.current, 4);
  });
  test('Decode ABBREV_ARRAY', () => {
    const offsetRef = { current: 0 };
    const buffer = Buffer.from([0xA1, 0x01, 0xC7]);
    const output = [
      new DataTypeSegment(DataType.ABBREV_ARRAY(DataType.UINT)),
    ];
    assert.deepEqual(EPath.Decode(buffer, offsetRef, true, false), output);
    assert.equal(offsetRef.current, 3);
  });
});
