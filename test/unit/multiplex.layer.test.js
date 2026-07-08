import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import Layer from '../../src/layers/Layer.js';
import MultiplexLayer from '../../src/layers/extras/MultiplexLayer.js';
import ScriptedTransport from '../harness/ScriptedTransport.js';

class CaptureLayer extends Layer {
  constructor(lowerLayer, name) {
    super(name, lowerLayer);
    this.received = [];
  }

  handleData(data) {
    this.received.push(data);
  }
}

function sleep(ms) {
  return new Promise((resolve) => { setTimeout(resolve, ms); });
}

describe('MultiplexLayer', () => {
  it('sends messages from an upper layer without crashing', async () => {
    /** layerContext() called incrementContext(this) from a plain module
     * function where `this` is undefined, so every multiplexed send threw
     * a TypeError */
    const transport = new ScriptedTransport();
    const mux = new MultiplexLayer(transport);
    const upper = new CaptureLayer(mux, 'upperA');

    upper.send(Buffer.from([0x01]), null, false);
    await sleep(10);

    assert.deepEqual(transport.sent, [Buffer.from([0x01])]);
  });

  it('routes responses back to the layer that sent the request', async () => {
    const transport = new ScriptedTransport();
    const mux = new MultiplexLayer(transport);
    const upperA = new CaptureLayer(mux, 'upperA');
    const upperB = new CaptureLayer(mux, 'upperB');

    upperA.send(Buffer.from([0xA1]), null, false);
    upperB.send(Buffer.from([0xB1]), null, false);
    await sleep(10);

    assert.equal(transport.requests.length, 2);

    /** answer in reverse order to prove context-based routing */
    transport.deliver(Buffer.from([0xB2]), null, transport.requests[1].context);
    transport.deliver(Buffer.from([0xA2]), null, transport.requests[0].context);

    assert.deepEqual(upperA.received, [Buffer.from([0xA2])]);
    assert.deepEqual(upperB.received, [Buffer.from([0xB2])]);
  });
});
