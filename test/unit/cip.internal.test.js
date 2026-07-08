import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import CIPInternalLayer from '../../src/layers/cip/layers/internal/CIPInternalLayer.js';
import PCCCLayer from '../../src/layers/pccc/index.js';
import ScriptedTransport from '../harness/ScriptedTransport.js';
import LogixResponder from '../harness/LogixResponder.js';

function hex(s) {
  return Buffer.from(s.replace(/\s+/g, ''), 'hex');
}

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

describe('PCCC forwarded over the CIP layer', () => {
  it('decodes the Execute-PCCC response and completes the request', async () => {
    const transport = new ScriptedTransport();
    const cip = new CIPInternalLayer(transport);
    const pccc = new PCCCLayer(cip);

    transport.onNextRequest((message, t, request) => {
      /** Execute PCCC (0x4B) reply: echoed request header (7 bytes,
       * length-prefixed) followed by the PCCC reply */
      t.deliver(Buffer.concat([
        hex('cb 00 00 00'),
        hex('07 cdab 78563412'),
        hex('4f00 0100 42 0500'),
      ]), null, request.context);
    });

    /** the response was decoded without an offsetRef, so every PCCC
     * response over CIP threw a TypeError and no request ever completed */
    const value = await withTimeout(pccc.typedRead('N7:1'), 'typedRead over CIP');
    assert.equal(value, 5);

    /** the outgoing request must be Execute PCCC to the PCCC object */
    const sent = transport.sent[0];
    assert.equal(sent.readUInt8(0), 0x4B);
    assert.deepEqual(sent.subarray(2, 6), hex('2067 2401'));
  });
});

describe('CIPInternalLayer exploreAttributes', () => {
  it('queries every attribute up to and including maxAttribute', async () => {
    const transport = new ScriptedTransport();
    const responder = new LogixResponder(transport);
    const cip = new CIPInternalLayer(transport);

    /** the loop stopped at maxAttribute - 1 */
    responder.replyToConnected(hex('8e 00 00 00 01'));
    responder.replyToConnected(hex('8e 00 00 00 02'));
    responder.replyToConnected(hex('8e 00 00 00 03'));

    const attributes = await withTimeout(
      cip.exploreAttributes(0x01, 1, 3),
      'exploreAttributes',
    );

    assert.deepEqual(attributes.map((attribute) => attribute.code), [1, 2, 3]);
    assert.equal(responder.connectedRequests.length, 3);

    await transport.close();
  });
});
