import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import Layer from '../../src/layers/Layer.js';

function sleep(ms) {
  return new Promise((resolve) => { setTimeout(resolve, ms); });
}

describe('Layer context bookkeeping', () => {
  it('removes the timeout handle entry when a context times out', async () => {
    const layer = new Layer('test', null);

    const errors = [];
    layer.contextCallback((err) => errors.push(err), 'ctx', 20);

    assert.equal(layer.__contextToCallback.size, 1);
    assert.equal(layer.__contextToCallbackTimeouts.size, 1);

    await sleep(50);

    assert.equal(errors.length, 1);
    assert.match(errors[0], /Timeout/);
    assert.equal(layer.__contextToCallback.size, 0);
    /** the timeout handle map leaked one dead entry per timed-out
     * request for the lifetime of the layer */
    assert.equal(layer.__contextToCallbackTimeouts.size, 0);
  });

  it('clearContexts returns the cleared entries', () => {
    const layer = new Layer('test', null);
    layer.setContextForID('id1', 'ctxA');
    layer.setContextForID('id2', 'ctxB');

    /** a live Map iterator taken before clear() always yields nothing */
    const entries = Array.from(layer.clearContexts());

    assert.deepEqual(entries, [['id1', 'ctxA'], ['id2', 'ctxB']]);
    assert.equal(layer.getContextForID('id1'), undefined);
  });
});
