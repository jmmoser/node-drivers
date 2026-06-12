import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import Defragger from '../../src/defragger.js';

/**
 * Test protocol: 1-byte length prefix followed by that many payload bytes.
 */
function createDefragger() {
  return new Defragger(
    (data, offsetRef, length) => length >= 1 && length >= 1 + data.readUInt8(0),
    (data) => 1 + data.readUInt8(0),
  );
}

function frame(...payload) {
  return Buffer.from([payload.length, ...payload]);
}

describe('Defragger', () => {
  it('returns null while a frame is incomplete', () => {
    const defragger = createDefragger();
    assert.equal(defragger.defrag(Buffer.from([3, 1])), null);
    assert.equal(defragger.defrag(Buffer.from([2])), null);
  });

  it('returns a frame once it is complete across chunks', () => {
    const defragger = createDefragger();
    assert.equal(defragger.defrag(Buffer.from([3, 1])), null);
    assert.deepEqual(defragger.defrag(Buffer.from([2, 3])), frame(1, 2, 3));
    assert.equal(defragger.defrag(), null);
  });

  it('returns an exactly-aligned single frame', () => {
    const defragger = createDefragger();
    assert.deepEqual(defragger.defrag(frame(9, 8)), frame(9, 8));
    assert.equal(defragger.defrag(), null);
  });

  it('returns every frame when one chunk contains multiple frames', () => {
    const defragger = createDefragger();
    const chunk = Buffer.concat([frame(1), frame(2, 3), frame(4, 5, 6)]);
    assert.deepEqual(defragger.defrag(chunk), frame(1));
    assert.deepEqual(defragger.defrag(), frame(2, 3));
    assert.deepEqual(defragger.defrag(), frame(4, 5, 6));
    assert.equal(defragger.defrag(), null);
  });

  it('keeps a trailing partial frame buffered after complete frames', () => {
    const defragger = createDefragger();
    const chunk = Buffer.concat([frame(1, 2), Buffer.from([2, 9])]);
    assert.deepEqual(defragger.defrag(chunk), frame(1, 2));
    assert.equal(defragger.defrag(), null);
    assert.deepEqual(defragger.defrag(Buffer.from([10])), frame(9, 10));
  });

  it('reassembles frames delivered byte-by-byte', () => {
    const defragger = createDefragger();
    const stream = Buffer.concat([frame(7, 8), frame(9)]);
    const frames = [];
    for (let i = 0; i < stream.length; i++) {
      let result = defragger.defrag(stream.subarray(i, i + 1));
      while (result != null) {
        frames.push(result);
        result = defragger.defrag();
      }
    }
    assert.deepEqual(frames, [frame(7, 8), frame(9)]);
  });
});
