import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import Modbus from '../../src/layers/modbus/index.js';
import ScriptedTransport from '../harness/ScriptedTransport.js';

/**
 * Golden-frame tests for the Modbus TCP layer.
 *
 * Expected byte sequences are taken from the worked examples in the
 * MODBUS Application Protocol Specification V1.1b3 (sections 6.1-6.12),
 * wrapped in an MBAP header (transaction, protocol 0, length, unit 0xFF).
 * They are intentionally hard-coded so that encode and decode are tested
 * against the spec rather than against each other.
 */

function hex(s) {
  return Buffer.from(s.replace(/\s+/g, ''), 'hex');
}

function createStack(options) {
  const transport = new ScriptedTransport();
  const layer = new Modbus(transport, options);
  return { transport, layer };
}

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

describe('Modbus TCP layer: spec example frames', () => {
  it('readCoils 20-38 unpacks 19 coil statuses LSB-first (spec 6.1)', async () => {
    const { transport, layer } = createStack();
    transport.reply(hex('0001 0000 0006 ff 01 03 cd 6b 05'));
    const value = await layer.readCoils(0x0013, 0x13);
    assert.deepEqual(transport.sent, [hex('0001 0000 0006 ff 01 0013 0013')]);
    /** 0xCD, 0x6B, 0x05 unpack to the spec's coil statuses 20-38; the
     * undefined pad bits of the last byte must not leak into the result */
    assert.deepEqual(value, [
      true, false, true, true, false, false, true, true,
      true, true, false, true, false, true, true, false,
      true, false, true,
    ]);
  });

  it('readDiscreteInputs 197-218 unpacks 22 input statuses (spec 6.2)', async () => {
    const { transport, layer } = createStack();
    transport.reply(hex('0001 0000 0006 ff 02 03 ac db 35'));
    const value = await layer.readDiscreteInputs(0x00C4, 0x16);
    assert.deepEqual(transport.sent, [hex('0001 0000 0006 ff 02 00c4 0016')]);
    assert.deepEqual(value, [
      false, false, true, true, false, true, false, true,
      true, true, false, true, true, false, true, true,
      true, false, true, false, true, true,
    ]);
  });

  it('readHoldingRegisters 108-110 (spec 6.3)', async () => {
    const { transport, layer } = createStack();
    transport.reply(hex('0001 0000 0009 ff 03 06 022b 0000 0064'));
    const value = await layer.readHoldingRegisters(0x006B, 3);
    assert.deepEqual(transport.sent, [hex('0001 0000 0006 ff 03 006b 0003')]);
    assert.deepEqual(value, [555, 0, 100]);
  });

  it('readInputRegisters 9 (spec 6.4)', async () => {
    const { transport, layer } = createStack();
    transport.reply(hex('0001 0000 0005 ff 04 02 000a'));
    const value = await layer.readInputRegisters(0x0008, 1);
    assert.deepEqual(transport.sent, [hex('0001 0000 0006 ff 04 0008 0001')]);
    assert.deepEqual(value, [10]);
  });

  it('writeSingleCoil ON encodes 0xFF00 (spec 6.5)', async () => {
    const { transport, layer } = createStack();
    transport.reply(hex('0001 0000 0006 ff 05 00ac ff00'));
    const value = await withTimeout(layer.writeSingleCoil(0x00AC, true), 'writeSingleCoil');
    assert.deepEqual(transport.sent, [hex('0001 0000 0006 ff 05 00ac ff00')]);
    assert.deepEqual(value, { address: 0x00AC, value: 0xFF00 });
  });

  it('writeSingleCoil OFF encodes 0x0000', async () => {
    const { transport, layer } = createStack();
    transport.reply(hex('0001 0000 0006 ff 05 0007 0000'));
    const value = await withTimeout(layer.writeSingleCoil(0x0007, false), 'writeSingleCoil');
    assert.deepEqual(transport.sent, [hex('0001 0000 0006 ff 05 0007 0000')]);
    assert.deepEqual(value, { address: 0x0007, value: 0x0000 });
  });

  it('writeSingleHoldingRegister (spec 6.6)', async () => {
    const { transport, layer } = createStack();
    transport.reply(hex('0001 0000 0006 ff 06 0001 0003'));
    const value = await layer.writeSingleHoldingRegister(0x0001, [3]);
    assert.deepEqual(transport.sent, [hex('0001 0000 0006 ff 06 0001 0003')]);
    assert.deepEqual(value, { address: 1, value: 3 });
  });

  it('writeSingleHoldingRegister accepts unsigned values >= 0x8000', async () => {
    const { transport, layer } = createStack();
    transport.reply(hex('0001 0000 0006 ff 06 0002 9c40'));
    const value = await withTimeout(
      layer.writeSingleHoldingRegister(0x0002, [40000]),
      'writeSingleHoldingRegister',
    );
    assert.deepEqual(transport.sent, [hex('0001 0000 0006 ff 06 0002 9c40')]);
    assert.deepEqual(value, { address: 2, value: 40000 });
  });

  it('writeMultipleCoils packs bits with quantity and byte count (spec 6.11)', async () => {
    const { transport, layer } = createStack();
    transport.reply(hex('0001 0000 0006 ff 0f 0013 000a'));
    const coils = [
      true, false, true, true, false, false, true, true,
      true, false,
    ];
    const value = await withTimeout(layer.writeMultipleCoils(0x0013, coils), 'writeMultipleCoils');
    assert.deepEqual(transport.sent, [hex('0001 0000 0009 ff 0f 0013 000a 02 cd 01')]);
    assert.deepEqual(value, { address: 0x0013, count: 10 });
  });

  it('writeMultipleCoils does not mutate the caller\'s array', async () => {
    const { transport, layer } = createStack();
    transport.reply(hex('0001 0000 0006 ff 0f 0000 0002'));
    const coils = [true, false];
    await withTimeout(layer.writeMultipleCoils(0, coils), 'writeMultipleCoils');
    assert.deepEqual(coils, [true, false]);
  });
});

describe('Modbus TCP layer: argument handling', () => {
  it('readHoldingRegisters count defaults to 1', async () => {
    const { transport, layer } = createStack();
    transport.reply(hex('0001 0000 0005 ff 03 02 0007'));
    const value = await withTimeout(layer.readHoldingRegisters(0x0008), 'readHoldingRegisters');
    assert.deepEqual(transport.sent, [hex('0001 0000 0006 ff 03 0008 0001')]);
    assert.deepEqual(value, [7]);
  });

  it('readHoldingRegisters(address, callback) treats the function as the callback', async () => {
    const { transport, layer } = createStack();
    transport.reply(hex('0001 0000 0005 ff 03 02 0007'));
    const value = await withTimeout(new Promise((resolve, reject) => {
      layer.readHoldingRegisters(0x0008, (err, val) => (err ? reject(err) : resolve(val)));
    }), 'readHoldingRegisters callback');
    assert.deepEqual(transport.sent, [hex('0001 0000 0006 ff 03 0008 0001')]);
    assert.deepEqual(value, [7]);
  });

  it('uses the unitID from constructor options', async () => {
    const { transport, layer } = createStack({ unitID: 0x11 });
    transport.reply(hex('0001 0000 0005 11 04 02 000a'));
    const value = await layer.readInputRegisters(0x0008, 1);
    assert.deepEqual(transport.sent, [hex('0001 0000 0006 11 04 0008 0001')]);
    assert.deepEqual(value, [10]);
  });
});

describe('Modbus TCP layer: exception responses', () => {
  it('rejects with the spec error description (spec 7)', async () => {
    const { transport, layer } = createStack();
    transport.reply(hex('0001 0000 0003 ff 83 02'));
    await assert.rejects(
      withTimeout(layer.readHoldingRegisters(0xFFFF, 1), 'readHoldingRegisters'),
      /Illegal data address/,
    );
  });

  it('rejects with the spec error description for illegal data value', async () => {
    const { transport, layer } = createStack();
    transport.reply(hex('0001 0000 0003 ff 85 03'));
    await assert.rejects(
      withTimeout(layer.writeSingleCoil(0, true), 'writeSingleCoil'),
      /Illegal data value/,
    );
  });
});

describe('Modbus TCP layer: framing', () => {
  const response = hex('0001 0000 0009 ff 03 06 022b 0000 0064');

  it('reassembles a response split across two chunks', async () => {
    const { transport, layer } = createStack();
    transport.onNextRequest((request, t) => {
      t.deliver(response.subarray(0, 4));
      t.deliver(response.subarray(4));
    });
    const value = await withTimeout(layer.readHoldingRegisters(0x006B, 3), 'split response');
    assert.deepEqual(value, [555, 0, 100]);
  });

  it('reassembles a response delivered byte-by-byte', async () => {
    const { transport, layer } = createStack();
    transport.onNextRequest((request, t) => {
      for (let i = 0; i < response.length; i++) {
        t.deliver(response.subarray(i, i + 1));
      }
    });
    const value = await withTimeout(layer.readHoldingRegisters(0x006B, 3), 'byte-by-byte response');
    assert.deepEqual(value, [555, 0, 100]);
  });

  it('handles two responses coalesced into one chunk', async () => {
    const { transport, layer } = createStack();
    const response1 = hex('0001 0000 0005 ff 03 02 0001');
    const response2 = hex('0002 0000 0005 ff 03 02 0002');
    transport.ignoreNextRequest();
    transport.onNextRequest((request, t) => {
      t.deliver(Buffer.concat([response1, response2]));
    });
    const first = layer.readHoldingRegisters(0, 1);
    const second = layer.readHoldingRegisters(1, 1);
    assert.deepEqual(
      await withTimeout(Promise.all([first, second]), 'coalesced responses'),
      [[1], [2]],
    );
  });
});

describe('Modbus TCP layer: robustness', () => {
  it('rejects a response whose byte count exceeds the received data', async () => {
    const { transport, layer } = createStack();
    /** byte count claims 6 data bytes but the frame only carries 1 —
     * must reject, not crash the process with an out-of-range read */
    transport.reply(hex('0001 0000 0004 ff 03 06 2b'));
    await assert.rejects(
      withTimeout(layer.readHoldingRegisters(0x006B, 3), 'malformed byte count'),
      /Malformed/,
    );
  });

  it('rejects an exception response missing its exception code', async () => {
    const { transport, layer } = createStack();
    transport.reply(hex('0001 0000 0002 ff 83'));
    await assert.rejects(
      withTimeout(layer.readHoldingRegisters(0, 1), 'empty exception frame'),
      /Malformed/,
    );
  });

  it('rejects with a timeout when the server never responds', async () => {
    const { transport, layer } = createStack({ timeout: 50 });
    transport.ignoreNextRequest();
    await assert.rejects(
      withTimeout(layer.readHoldingRegisters(0, 1), 'unanswered request'),
      /Timeout/,
    );
  });

  it('honors a per-request unitID of 0 (broadcast)', async () => {
    const { transport, layer } = createStack();
    transport.reply(hex('0001 0000 0005 00 03 02 0007'));
    const value = await withTimeout(new Promise((resolve, reject) => {
      layer._send(hex('03 0000 0001'), { unitID: 0 }, { resolve, reject });
    }), 'unitID 0 request');
    assert.deepEqual(transport.sent, [hex('0001 0000 0006 00 03 0000 0001')]);
    assert.deepEqual(value, [7]);
  });
});

describe('Modbus TCP layer: transactions', () => {
  it('increments the transaction ID per request', async () => {
    const { transport, layer } = createStack();
    transport.reply(hex('0001 0000 0005 ff 03 02 0001'));
    transport.reply(hex('0002 0000 0005 ff 03 02 0002'));
    await layer.readHoldingRegisters(0, 1);
    await layer.readHoldingRegisters(1, 1);
    assert.deepEqual(transport.sent, [
      hex('0001 0000 0006 ff 03 0000 0001'),
      hex('0002 0000 0006 ff 03 0001 0001'),
    ]);
  });

  it('matches out-of-order responses to the right requests', async () => {
    const { transport, layer } = createStack();
    transport.ignoreNextRequest();
    transport.onNextRequest((request, t) => {
      t.deliver(hex('0002 0000 0005 ff 03 02 0002'));
      t.deliver(hex('0001 0000 0005 ff 03 02 0001'));
    });
    const first = layer.readHoldingRegisters(0, 1);
    const second = layer.readHoldingRegisters(1, 1);
    assert.deepEqual(
      await withTimeout(Promise.all([first, second]), 'out-of-order responses'),
      [[1], [2]],
    );
  });
});
