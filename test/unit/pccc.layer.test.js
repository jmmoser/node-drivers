import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import PCCCLayer from '../../src/layers/pccc/index.js';
import ScriptedTransport from '../harness/ScriptedTransport.js';

/**
 * Golden-frame tests for the PCCC layer.
 *
 * Expected byte sequences follow the DF1 protocol reference manual
 * (Allen-Bradley publication 1770-6.5.16): commands are
 * CMD(1) STS(1) TNS(2, little-endian) FNC(1) followed by
 * function-specific data; replies set 0x40 in CMD. Logical ASCII
 * addresses are encoded as 0x00 0x24 '<address>' 0x00. Typed data uses
 * the FLAG-byte descriptor scheme (type id in the high nibble, size in
 * the low nibble, extended forms when a field exceeds 3/4 bits).
 */

function hex(s) {
  return Buffer.from(s.replace(/\s+/g, ''), 'hex');
}

function createStack() {
  const transport = new ScriptedTransport();
  const layer = new PCCCLayer(transport);
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

describe('PCCC layer: typed read', () => {
  it('reads an integer file element (CMD 0x0F, FNC 0x68)', async () => {
    const { transport, layer } = createStack();
    transport.reply(hex('4f00 0100 42 0500'));
    const value = await withTimeout(layer.typedRead('N7:1'), 'typedRead');
    assert.deepEqual(transport.sent, [
      hex('0f00 0100 68 0000 0100 0024 4e373a31 00 0100'),
    ]);
    assert.equal(value, 5);
  });

  it('reads multiple integer elements as an array', async () => {
    const { transport, layer } = createStack();
    /** array descriptor (0x97 0x09, 7 bytes) containing INT descriptor 0x42 */
    transport.reply(hex('4f00 0100 9709 42 0000 feff ff00'));
    const value = await withTimeout(layer.typedRead('N7:0', 3), 'typedRead');
    assert.deepEqual(transport.sent, [
      hex('0f00 0100 68 0000 0300 0024 4e373a30 00 0300'),
    ]);
    assert.deepEqual(value, [0, -2, 255]);
  });

  it('reads a float file element (extended type id descriptor 0x94 0x08)', async () => {
    const { transport, layer } = createStack();
    transport.reply(hex('4f00 0100 9408 0000c03f'));
    const value = await withTimeout(layer.typedRead('F8:0'), 'typedRead');
    assert.deepEqual(transport.sent, [
      hex('0f00 0100 68 0000 0100 0024 46383a30 00 0100'),
    ]);
    assert.equal(value, 1.5);
  });

  it('reads a timer element into a structured value', async () => {
    const { transport, layer } = createStack();
    /** descriptor 0x56 (Timer, 6 bytes): EN set, PRE 1000, ACC 500 */
    transport.reply(hex('4f00 0100 56 0080 e803 f401'));
    const value = await withTimeout(layer.typedRead('T4:0'), 'typedRead');
    assert.deepEqual(transport.sent, [
      hex('0f00 0100 68 0000 0100 0024 54343a30 00 0100'),
    ]);
    assert.deepEqual(value, {
      EN: true, TT: false, DN: false, PRE: 1000, ACC: 500,
    });
  });
});

describe('PCCC layer: typed write', () => {
  it('writes an integer file element (CMD 0x0F, FNC 0x67)', async () => {
    const { transport, layer } = createStack();
    transport.reply(hex('4f00 0100'));
    const reply = await withTimeout(layer.typedWrite('N7:3', 5), 'typedWrite');
    assert.deepEqual(transport.sent, [
      hex('0f00 0100 67 0000 0100 0024 4e373a33 00 42 0500'),
    ]);
    assert.equal(reply.status.code, 0);
  });

  it('writes a float file element (extended type id descriptor 0x94 0x08)', async () => {
    const { transport, layer } = createStack();
    transport.reply(hex('4f00 0100'));
    const reply = await withTimeout(layer.typedWrite('F8:0', 1.5), 'typedWrite');
    assert.deepEqual(transport.sent, [
      hex('0f00 0100 67 0000 0100 0024 46383a30 00 9408 0000c03f'),
    ]);
    assert.equal(reply.status.code, 0);
  });

  it('rejects writes to timer files with a clear error', async () => {
    const { layer } = createStack();
    await assert.rejects(
      withTimeout(layer.typedWrite('T4:0', 1), 'typedWrite'),
      /not currently supported/,
    );
  });

  it('rejects writes to long files with a clear error', async () => {
    const { layer } = createStack();
    await assert.rejects(
      withTimeout(layer.typedWrite('L9:0', 1), 'typedWrite'),
      /not currently supported/,
    );
  });

  it('rejects unknown address prefixes', async () => {
    const { layer } = createStack();
    await assert.rejects(
      withTimeout(layer.typedWrite('Q2:0', 1), 'typedWrite'),
      /Unsupported address/,
    );
  });
});

describe('PCCC layer: other commands', () => {
  it('word range read (CMD 0x0F, FNC 0x01) resolves the raw data', async () => {
    const { transport, layer } = createStack();
    transport.reply(hex('4f00 0100 3412 7856'));
    const value = await withTimeout(layer.wordRangeRead('N7:0', 2), 'wordRangeRead');
    assert.deepEqual(transport.sent, [
      hex('0f00 0100 01 0000 0200 0024 4e373a30 00 04'),
    ]);
    assert.deepEqual(value, hex('3412 7856'));
  });

  it('diagnostic status (CMD 0x06, FNC 0x03)', async () => {
    const { transport, layer } = createStack();
    transport.reply(hex('4600 0100 ee31c0'));
    const value = await withTimeout(layer.diagnosticStatus(), 'diagnosticStatus');
    assert.deepEqual(transport.sent, [hex('0600 0100 03')]);
    assert.deepEqual(value, hex('ee31c0'));
  });

  it('echo (CMD 0x06, FNC 0x00)', async () => {
    const { transport, layer } = createStack();
    transport.reply(hex('4600 0100 dead'));
    const value = await withTimeout(layer.echo(hex('dead')), 'echo');
    assert.deepEqual(transport.sent, [hex('0600 0100 00 dead')]);
    assert.deepEqual(value, hex('dead'));
  });
});

describe('PCCC layer: error replies', () => {
  it('rejects with the STS description', async () => {
    const { transport, layer } = createStack();
    transport.reply(hex('4f10 0100'));
    await assert.rejects(
      withTimeout(layer.typedRead('N7:0'), 'typedRead'),
      /Illegal command or format/,
    );
  });

  it('rejects with the EXT STS description when STS is 0xF0', async () => {
    const { transport, layer } = createStack();
    transport.reply(hex('4ff0 0100 11'));
    await assert.rejects(
      withTimeout(layer.typedRead('N7:0'), 'typedRead'),
      /Illegal data type/,
    );
  });
});

describe('PCCC layer: transactions', () => {
  it('increments the transaction number per request', async () => {
    const { transport, layer } = createStack();
    transport.reply(hex('4f00 0100 42 0100'));
    transport.reply(hex('4f00 0200 42 0200'));
    await withTimeout(layer.typedRead('N7:0'), 'first typedRead');
    await withTimeout(layer.typedRead('N7:1'), 'second typedRead');
    assert.deepEqual(transport.sent, [
      hex('0f00 0100 68 0000 0100 0024 4e373a30 00 0100'),
      hex('0f00 0200 68 0000 0100 0024 4e373a31 00 0100'),
    ]);
  });

  it('matches out-of-order replies by transaction number', async () => {
    const { transport, layer } = createStack();
    transport.ignoreNextRequest();
    transport.onNextRequest((request, t) => {
      t.deliver(hex('4f00 0200 42 0200'));
      t.deliver(hex('4f00 0100 42 0100'));
    });
    const first = layer.typedRead('N7:0');
    const second = layer.typedRead('N7:1');
    assert.deepEqual(
      await withTimeout(Promise.all([first, second]), 'out-of-order replies'),
      [1, 2],
    );
  });
});
