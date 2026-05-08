import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import EPath from '../../src/layers/cip/core/epath/index.js';

const { Network } = EPath.Segments;

describe('Network Segment Production Inhibit Time', () => {
  test('Encode', () => {
    assert.deepEqual(new Network.ProductionInhibitTime(5).encode(), Buffer.from([0x43, 0x05]));
  });
  test('Decode', () => {
    const offsetRef = { current: 0 };
    const buffer = Buffer.from([0x43, 0x05]);
    const output = [
      new Network.ProductionInhibitTime(5),
    ];
    assert.deepEqual(EPath.Decode(buffer, offsetRef, true, false), output);
    assert.equal(offsetRef.current, 2);
  });
});
