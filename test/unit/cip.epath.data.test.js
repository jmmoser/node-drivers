import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import EPath from '../../src/layers/cip/core/epath/index.js';

const { Data } = EPath.Segments;

describe('Simple Data Segment', () => {
  test('Encode', () => {
    assert.deepEqual(
      new Data.Simple(Buffer.from([0x01, 0x00, 0x02, 0x00])).encode(),
      Buffer.from([0x80, 0x02, 0x01, 0x00, 0x02, 0x00]),
    );
  });
  test('Invalid Encode', () => {
    assert.throws(() => new Data.Simple(Buffer.from([0x01, 0x00, 0x02])));
    assert.throws(() => new Data.Simple(1));

    assert.throws(() => {
      const segment = new Data.Simple(Buffer.from([0x01, 0x00, 0x02, 0x00]));
      const buffer = Buffer.alloc(5);
      segment.encodeTo(buffer, 0);
    });
  });

  test('Decode', () => {
    const offsetRef = { current: 0 };
    const buffer = Buffer.from([0x80, 0x02, 0x01, 0x00, 0x02, 0x00]);
    const output = [new Data.Simple(Buffer.from([0x01, 0x00, 0x02, 0x00]))];
    assert.deepEqual(EPath.Decode(buffer, offsetRef, true, false), output);
    assert.equal(offsetRef.current, 6);
  });
  test('Invalid Decode', () => {
    const offsetRef = { current: 0 };
    const buffer = Buffer.from([0x80, 0x02, 0x01, 0x00, 0x02]);
    assert.throws(
      () => EPath.Decode(buffer, offsetRef, true, false, () => {}),
    );
  });
});

describe('ANSI Extended Symbol Data Segment', () => {
  test('Encode Single Character', () => {
    assert.deepEqual(new Data.ANSIExtendedSymbol('a').encode(), Buffer.from([0x91, 0x01, 0x61, 0x00]));
  });
  test('Encode', () => {
    assert.deepEqual(new Data.ANSIExtendedSymbol('start1').encode(), Buffer.from([0x91, 0x06, 0x73, 0x74, 0x61, 0x72, 0x74, 0x31]));
  });
  test('Encode With Pad Byte', () => {
    assert.deepEqual(new Data.ANSIExtendedSymbol('start').encode(), Buffer.from([0x91, 0x05, 0x73, 0x74, 0x61, 0x72, 0x74, 0x00]));
  });
  test('Invalid Encode', () => {
    assert.throws(() => new Data.ANSIExtendedSymbol(Buffer.from([0x01, 0x00, 0x02])));
    assert.throws(() => new Data.ANSIExtendedSymbol(''));
  });

  test('Decode', () => {
    const offsetRef = { current: 0 };
    const buffer = Buffer.from([0x91, 0x06, 0x73, 0x74, 0x61, 0x72, 0x74, 0x31]);
    const output = [new Data.ANSIExtendedSymbol('start1')];
    assert.deepEqual(EPath.Decode(buffer, offsetRef, true, false), output);
    assert.equal(offsetRef.current, 8);
  });
  test('Decode With Pad Byte', () => {
    const offsetRef = { current: 0 };
    const buffer = Buffer.from([0x91, 0x05, 0x73, 0x74, 0x61, 0x72, 0x74, 0x00]);
    const output = [new Data.ANSIExtendedSymbol('start')];
    assert.deepEqual(EPath.Decode(buffer, offsetRef, true, false), output);
    assert.equal(offsetRef.current, 8);
  });
  test('Invalid Decode', () => {
    /** Pad byte must be 0x00 */
    const offsetRef = { current: 0 };
    assert.throws(
      () => EPath.Decode(Buffer.from([
        0x91, 0x05, 0x73, 0x74,
        0x61, 0x72, 0x74, 0x01,
      ]), offsetRef, true, false, () => {}),
    );
    /** Invalid length */

    offsetRef.current = 0;
    assert.throws(
      () => EPath.Decode(Buffer.from([
        0x91, 0x06, 0x73, 0x74, 0x61, 0x72, 0x74,
      ]), offsetRef, true, false, () => { }),
    );
  });
});

describe('Data Segment', () => {
  test('Invalid Subtype', () => {
    assert.throws(() => new Data(-1, 1));

    const offsetRef = { current: 0 };
    assert.throws(
      () => EPath.Decode(Buffer.from([
        0x81, 0x02, 0x01, 0x00, 0x02, 0x00,
      ]), offsetRef, true, false, () => { }),
    );
  });
});
