import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { getBits } from '../../src/utils.js';

describe('getBits', () => {
  test('getBits', () => {
    assert.equal(getBits(0, 0, 1), 0);
    assert.equal(getBits(0, 0, 2), 0);
    assert.equal(getBits(0, 3, 8), 0);
    assert.equal(getBits(0b00001111, 0, 1), 1);
    assert.equal(getBits(1, 0, 1), 1);
    assert.equal(getBits(1, 2, 9), 0);
    assert.equal(getBits(1, 0, 2), 1);
    assert.equal(getBits(-1, 0, 1), 1);
    assert.equal(getBits(2, 0, 1), 0);
    assert.equal(getBits(2, 0, 2), 2);
  });
});
