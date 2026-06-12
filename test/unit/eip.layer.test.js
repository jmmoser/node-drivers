import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import EIPLayer from '../../src/layers/cip/layers/EIP/index.js';
import EIPPacket from '../../src/layers/cip/layers/EIP/packet.js';
import CPF from '../../src/layers/cip/layers/EIP/cpf.js';
import ScriptedTransport from '../harness/ScriptedTransport.js';

/**
 * EIP encapsulation tests (CIP Vol 2): 24-byte header
 * (command, length, session, status, sender context, options) followed
 * by command-specific data, all little-endian except sockaddr fields.
 */

function hex(s) {
  return Buffer.from(s.replace(/\s+/g, ''), 'hex');
}

function withTimeout(promise, label, ms = 3000) {
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

/** ListIdentity CPF item: version, sockaddr (big-endian family/port/address),
 * identity attributes 1-7, state */
function listIdentityResponse(addressByte) {
  const item = hex(
    '0100' /** encapsulation protocol version 1 */
    + '0002 af12' /** sin_family AF_INET, sin_port 44818 (big-endian) */
    + `c0a801${addressByte.toString(16).padStart(2, '0')}` /** sin_addr 192.168.1.x */
    + '0000000000000000' /** sin_zero */
    + '0100' /** vendor 1 (Rockwell) */
    + '0c00' /** device type 0x0C (communications adapter) */
    + '9900' /** product code */
    + '0101' /** revision 1.1 */
    + '0000' /** status */
    + '78563412' /** serial number */
    + '0158' /** product name: short string 'X' */
    + '03', /** state: operational */
  );
  const cpf = Buffer.concat([
    hex('0100 0c00'),
    Buffer.from([item.length, 0]),
    item,
  ]);
  return Buffer.concat([
    hex('6300'),
    Buffer.from([cpf.length, 0]),
    hex('00000000 00000000 0000000000000000 00000000'),
    cpf,
  ]);
}

describe('EIP packet codec', () => {
  it('encodes a RegisterSession request (CIP Vol 2, 2-4.4)', () => {
    assert.deepEqual(
      EIPPacket.RegisterSessionRequest(Buffer.alloc(8)),
      hex('6500 0400 00000000 00000000 0000000000000000 00000000 01000000'),
    );
  });

  it('preserves a nonzero status through fromBuffer/toBuffer', () => {
    const original = hex('6500 0000 00000000 69000000 0102030405060708 00000000');
    const packet = EIPPacket.fromBuffer(original, { current: 0 });
    assert.equal(packet.status.code, 0x69);
    assert.deepEqual(packet.toBuffer(), original);
  });
});

describe('EIP CPF decoding', () => {
  it('caps ListServices names at the 16-byte field', () => {
    const name = 'A'.repeat(16);
    const item = Buffer.concat([
      hex('0100 2001'), /** version 1, flags 0x0120 */
      Buffer.from(name, 'ascii'),
    ]);
    const buffer = Buffer.concat([
      hex('0100 0001'), /** one item, type 0x0100 ListServices */
      Buffer.from([item.length, 0]),
      item,
      Buffer.from([0x42]), /** stray trailing byte must not leak into the name */
    ]);
    const items = CPF.Packet.Decode(buffer, { current: 0 });
    assert.equal(items.length, 1);
    assert.equal(items[0].value.name, name);
    assert.equal(items[0].value.flags.supportsCIPPacketEncapsulationViaTCP, true);
    assert.equal(items[0].value.flags.supportsCIPClass0or1UDPBasedConnections, true);
  });
});

describe('EIP layer', () => {
  it('registers a session and stores the assigned handle', async () => {
    const transport = new ScriptedTransport();
    const layer = new EIPLayer(transport);
    transport.reply(hex('6500 0400 44332211 00000000 0000000000000000 00000000 01000000'));

    await withTimeout(new Promise((resolve) => layer.connect(resolve)), 'connect');

    assert.deepEqual(transport.sent, [
      hex('6500 0400 00000000 00000000 0000000000000000 00000000 01000000'),
    ]);
    assert.equal(layer._sessionHandle, 0x11223344);
    await transport.close();
  });

  it('listIdentity resolves a single device', async () => {
    const transport = new ScriptedTransport();
    const layer = new EIPLayer(transport);
    transport.reply(listIdentityResponse(10));

    const identity = await withTimeout(layer.listIdentity(), 'listIdentity');

    assert.deepEqual(transport.sent, [
      hex('6300 0000 00000000 00000000 0000000000000000 00000000'),
    ]);
    assert.equal(identity.value.socket.address, '192.168.1.10');
    assert.equal(identity.value.socket.port, 44818);
    await transport.close();
  });

  it('listIdentity with multiple hosts returns every device', async () => {
    const transport = new ScriptedTransport();
    const layer = new EIPLayer(transport);
    transport.reply(listIdentityResponse(10));
    transport.reply(listIdentityResponse(20));

    const identities = await withTimeout(
      layer.listIdentity({ hosts: ['192.168.1.10:44818', '192.168.1.20:44818'] }),
      'listIdentity multi-host',
      5000,
    );

    assert.equal(transport.sent.length, 2);
    assert.deepEqual(
      identities.map((identity) => identity.value.socket.address),
      ['192.168.1.10', '192.168.1.20'],
    );
    await transport.close();
  });
});
