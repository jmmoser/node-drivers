import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import UDPLayer from '../../src/layers/udp/index.js';

function withTimeout(promise, label, ms = 2000) {
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

describe('UDP layer', () => {
  it('closes the bound socket when the layer is destroyed', async () => {
    const layer = new UDPLayer({ host: '127.0.0.1', port: 44818 });

    const socket = layer.socket;
    await withTimeout(
      new Promise((resolve) => { socket.once('listening', resolve); }),
      'socket listening',
    );

    /** handleDestroy only unref'd the socket, leaving the port bound
     * (and receiving) for the life of the process */
    const closed = new Promise((resolve) => { socket.once('close', resolve); });
    layer.destroy('destroyed by test');
    await withTimeout(closed, 'socket close after destroy');

    assert.equal(layer.socket, null);
    assert.throws(() => socket.address(), /not running/i);
  });
});
