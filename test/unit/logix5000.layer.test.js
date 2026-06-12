import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import Logix5000 from '../../src/layers/cip/layers/Logix5000/index.js';
import CIPRequest from '../../src/layers/cip/core/request.js';
import EPath from '../../src/layers/cip/core/epath/index.js';
import ScriptedTransport from '../harness/ScriptedTransport.js';
import LogixResponder from '../harness/LogixResponder.js';

/**
 * Tests for the Logix5000 layer over an emulated CIP connection.
 *
 * Wire bytes follow the Logix5000 Data Access reference (Rockwell
 * publication 1756-PM020) and CIP Vol 1: symbol services 0x4C (Read Tag),
 * 0x52 (Read Tag Fragmented), 0x4D (Write Tag), 0x4E (Read Modify Write),
 * 0x55 (Get Instance Attribute List); ANSI extended symbolic paths
 * (0x91, length, name); type codes 0xC4 (DINT) and 0xCA (REAL).
 */

function hex(s) {
  return Buffer.from(s.replace(/\s+/g, ''), 'hex');
}

function createStack() {
  const transport = new ScriptedTransport();
  const responder = new LogixResponder(transport);
  const layer = new Logix5000(transport);
  return { transport, responder, layer };
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

describe('Logix5000: connection handshake', () => {
  it('opens with ForwardOpen and closes with ForwardClose', async () => {
    const { transport, responder, layer } = createStack();
    responder.replyToConnected(hex('cc 00 0000 c400 39300000'));
    await withTimeout(layer.readTag('TagA', 1), 'readTag');

    assert.equal(responder.forwardOpenRequests.length, 1);
    const forwardOpen = responder.forwardOpenRequests[0];
    /** service, path size 2 words, Connection Manager class 0x06 instance 1 */
    assert.deepEqual(forwardOpen.subarray(0, 6), hex('54 02 2006 2401'));

    await withTimeout(transport.close(), 'close');
    assert.equal(responder.forwardCloseRequests.length, 1);
    assert.deepEqual(responder.forwardCloseRequests[0].subarray(0, 6), hex('4e 02 2006 2401'));
  });
});

describe('Logix5000: readTag', () => {
  it('reads an atomic DINT tag', async () => {
    const { transport, responder, layer } = createStack();
    responder.replyToConnected(hex('cc 00 0000 c400 39300000'));
    const value = await withTimeout(layer.readTag('TagA', 1), 'readTag');
    assert.deepEqual(responder.connectedRequests, [
      hex('4c 03 9104 54616741 0100'),
    ]);
    assert.equal(value, 12345);
    await transport.close();
  });

  it('reads an atomic REAL tag', async () => {
    const { transport, responder, layer } = createStack();
    responder.replyToConnected(hex('cc 00 0000 ca00 0000c03f'));
    const value = await withTimeout(layer.readTag('Speed', 1), 'readTag');
    assert.deepEqual(responder.connectedRequests, [
      hex('4c 04 9105 5370656564 00 0100'),
    ]);
    assert.equal(value, 1.5);
    await transport.close();
  });

  it('reads multiple elements as an array', async () => {
    const { transport, responder, layer } = createStack();
    responder.replyToConnected(hex('cc 00 0000 c400 01000000 02000000 03000000'));
    const value = await withTimeout(layer.readTag('TagA', 3), 'readTag');
    assert.deepEqual(responder.connectedRequests, [
      hex('4c 03 9104 54616741 0300'),
    ]);
    assert.deepEqual(value, [1, 2, 3]);
    await transport.close();
  });

  it('reads a large tag with fragmented transfers', async () => {
    const { transport, responder, layer } = createStack();
    /** initial read replies with partial transfer (status 0x06) */
    responder.replyToConnected(hex('cc 00 0600 c400 01000000'));
    /** first fragment: partial, elements 1 and 2 */
    responder.replyToConnected(hex('d2 00 0600 c400 01000000 02000000'));
    /** second fragment: complete, element 3 */
    responder.replyToConnected(hex('d2 00 0000 c400 03000000'));

    const value = await withTimeout(layer.readTag('TagA', 3), 'readTag fragmented');

    assert.deepEqual(responder.connectedRequests, [
      hex('4c 03 9104 54616741 0300'),
      /** fragmented read from byte offset 0 */
      hex('52 03 9104 54616741 0300 00000000'),
      /** fragmented read resumes at byte offset 8 (2 DINTs received) */
      hex('52 03 9104 54616741 0300 08000000'),
    ]);
    assert.deepEqual(value, [1, 2, 3]);
    await transport.close();
  });

  it('rejects with the CIP status description on error replies', async () => {
    const { transport, responder, layer } = createStack();
    responder.replyToConnected(hex('cc 00 0500'));
    await assert.rejects(
      withTimeout(layer.readTag('TagA', 1), 'readTag'),
      /Request Path destination unknown/,
    );
    await transport.close();
  });

  it('rejects cleanly when an object-mapped status has no extended status', async () => {
    const { transport, responder, layer } = createStack();
    /** status 0xFF maps to extended descriptions; reply carries none */
    responder.replyToConnected(hex('cc 00 ff00'));
    await assert.rejects(
      withTimeout(layer.readTag('TagA', 1), 'readTag'),
      /CIP Error/,
    );
    await transport.close();
  });
});

describe('Logix5000: writeTag', () => {
  it('looks up each tag\'s own type before writing', async () => {
    const { transport, responder, layer } = createStack();

    /** instance attribute list (names) starting at instance 0: TagA(1), TagB(2) */
    responder.onConnected((mr) => {
      assert.deepEqual(mr, hex('55 02 206b 2400 0100 0100'));
      return hex('d5 00 0000 01000000 0400 54616741 02000000 0400 54616742');
    });
    /** instance attribute list (types) starting at instance 2: TagB is REAL */
    responder.onConnected((mr) => {
      assert.deepEqual(mr, hex('55 02 206b 2402 0100 0200'));
      return hex('d5 00 0000 02000000 ca00');
    });
    /** write TagB as REAL 1.5 */
    responder.onConnected((mr) => {
      assert.deepEqual(mr, hex('4d 03 9104 54616742 ca00 0100 0000c03f'));
      return hex('cd 00 0000');
    });
    await withTimeout(layer.writeTag('TagB', 1.5), 'writeTag TagB');

    /** instance attribute list (types) starting at instance 1: TagA is DINT */
    responder.onConnected((mr) => {
      assert.deepEqual(mr, hex('55 02 206b 2401 0100 0200'));
      return hex('d5 00 0000 01000000 c400 02000000 ca00');
    });
    /** write TagA as DINT 99 — not with TagB's cached REAL type */
    responder.onConnected((mr) => {
      assert.deepEqual(mr, hex('4d 03 9104 54616741 c400 0100 63000000'));
      return hex('cd 00 0000');
    });
    await withTimeout(layer.writeTag('TagA', 99), 'writeTag TagA');

    assert.equal(responder.connectedRequests.length, 5);
    await transport.close();
  });
});

describe('Logix5000: readModifyWriteTag', () => {
  it('encodes the masks (1756-PM020 Read Modify Write)', async () => {
    const { transport, responder, layer } = createStack();
    responder.replyToConnected(hex('ce 00 0000'));
    await withTimeout(layer.readModifyWriteTag('TagA', [0x0F], [0xF0]), 'readModifyWriteTag');
    assert.deepEqual(responder.connectedRequests, [
      hex('4e 03 9104 54616741 0100 0f f0'),
    ]);
    await transport.close();
  });

  it('rejects mask values above 255 with a clear error', async () => {
    const { transport, layer } = createStack();
    await assert.rejects(
      withTimeout(layer.readModifyWriteTag('TagA', [0x1FF, 0x00], [0xFF, 0xFF]), 'readModifyWriteTag'),
      /Values in masks must be/,
    );
    await transport.close();
  });
});

describe('Logix5000: request timeouts', () => {
  it('rejects when no response arrives within the timeout', async () => {
    const { transport, responder, layer } = createStack();
    responder.ignoreConnected();
    const path = EPath.Encode(true, EPath.ConvertSymbolToSegments('TagA'));
    const request = new CIPRequest(0x4C, path, hex('0100'));
    await assert.rejects(
      withTimeout(layer.sendRequest(true, request, null, 50), 'sendRequest'),
      /Timeout/,
    );
    await transport.close();
  });
});

describe('CIP connection layer: resend keep-alive', () => {
  it('stops the keep-alive interval when the layer is destroyed', async () => {
    const { transport, responder, layer } = createStack();
    responder.replyToConnected(hex('cc 00 0000 c400 39300000'));
    await withTimeout(layer.readTag('TagA', 1), 'readTag');

    const connectionLayer = layer.lowerLayer;
    assert.ok(connectionLayer.__resendInterval != null, 'keep-alive interval should be armed');

    connectionLayer.destroy('test');
    assert.equal(connectionLayer.__resendInterval, null, 'keep-alive interval should be cleared on destroy');
    await transport.close();
  });
});
