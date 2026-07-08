import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { getBits, CallbackPromise, InvertKeyValues } from '../../src/utils.js';

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

describe('CallbackPromise', () => {
  function withTimeout(promise, label, ms = 1000) {
    return new Promise((resolve, reject) => {
      const handle = setTimeout(() => {
        reject(new Error(`${label} did not settle within ${ms}ms`));
      }, ms);
      promise.then(
        (value) => { clearTimeout(handle); resolve(value); },
        (err) => { clearTimeout(handle); reject(err); },
      );
    });
  }

  test('rejects when an async executor throws', async () => {
    /** rejections from async executors were discarded, leaving the
     * returned promise pending forever plus an unhandledRejection */
    await assert.rejects(
      withTimeout(CallbackPromise(null, async () => {
        throw new Error('async boom');
      }), 'async executor rejection'),
      /async boom/,
    );
  });

  test('rejects when an async executor throws after awaiting', async () => {
    await assert.rejects(
      withTimeout(CallbackPromise(null, async () => {
        await new Promise((resolve) => { setImmediate(resolve); });
        throw new Error('late boom');
      }), 'late async executor rejection'),
      /late boom/,
    );
  });

  test('invokes the node-style callback when an async executor throws', async () => {
    const error = await withTimeout(new Promise((resolve) => {
      CallbackPromise((err) => resolve(err), async () => {
        throw new Error('callback boom');
      });
    }), 'callback style rejection');
    assert.match(error.message, /callback boom/);
  });

  test('still resolves through the resolver', async () => {
    assert.equal(await CallbackPromise(null, (resolver) => resolver.resolve(42)), 42);
  });
});

describe('InvertKeyValues', () => {
  test('inverts a Map', () => {
    /** the Map branch called obj.entries().forEach, which does not exist
     * on Node 20 (the minimum supported engine) */
    const inverted = InvertKeyValues(new Map([['a', 1], ['b', 2]]));
    assert.equal(inverted.get(1), 'a');
    assert.equal(inverted.get(2), 'b');
  });
});
