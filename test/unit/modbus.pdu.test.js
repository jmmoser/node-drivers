import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import PDU from '../../src/core/modbus/pdu.js';
import TCPFrame from '../../src/core/modbus/frames/tcp.js';
import { Functions } from '../../src/core/modbus/constants.js';

/**
 * Golden byte sequences from the MODBUS Application Protocol
 * Specification V1.1b3 worked examples.
 */

function hex(s) {
  return Buffer.from(s.replace(/\s+/g, ''), 'hex');
}

describe('Modbus PDU encoding', () => {
  it('encodes a read request (spec 6.3)', () => {
    assert.deepEqual(
      PDU.EncodeReadRequest(Functions.ReadHoldingRegisters, 0x006B, 3),
      hex('03 006b 0003'),
    );
  });

  it('encodes a write request with unsigned 16-bit values', () => {
    assert.deepEqual(
      PDU.EncodeWriteRequest(Functions.WriteSingleHoldingRegister, 0x0002, [40000]),
      hex('06 0002 9c40'),
    );
  });

  it('encodes negative values as two\'s complement', () => {
    assert.deepEqual(
      PDU.EncodeWriteRequest(Functions.WriteSingleHoldingRegister, 0x0000, [-1]),
      hex('06 0000 ffff'),
    );
  });

  it('encodes write request values given as 2-byte buffers', () => {
    assert.deepEqual(
      PDU.EncodeWriteRequest(Functions.WriteSingleHoldingRegister, 0x0001, [hex('abcd')]),
      hex('06 0001 abcd'),
    );
  });

  it('encodes a write multiple coils request (spec 6.11)', () => {
    const coils = [
      true, false, true, true, false, false, true, true,
      true, false,
    ];
    assert.deepEqual(
      PDU.EncodeWriteMultipleCoilsRequest(0x0013, coils),
      hex('0f 0013 000a 02 cd 01'),
    );
  });
});

describe('Modbus PDU decoding', () => {
  it('decodes a read holding registers response (spec 6.3)', () => {
    const pdu = PDU.Decode(hex('03 06 022b 0000 0064'), { current: 0 }, 8);
    assert.equal(pdu.error, undefined);
    assert.deepEqual(pdu.value, [555, 0, 100]);
    assert.equal(pdu.fn.code, Functions.ReadHoldingRegisters);
  });

  it('decodes an exception response (spec 7)', () => {
    const pdu = PDU.Decode(hex('83 02'), { current: 0 }, 2);
    assert.equal(pdu.error.code, 2);
    assert.equal(pdu.error.message, 'Illegal data address');
  });
});

describe('Modbus TCP frame', () => {
  it('encodes the MBAP header (big-endian, length covers unit + PDU)', () => {
    assert.deepEqual(
      TCPFrame.Encode(0x0001, 0, 0xFF, hex('03 006b 0003')),
      hex('0001 0000 0006 ff 03 006b 0003'),
    );
  });

  it('decodes a full frame', () => {
    const packet = TCPFrame.Decode(hex('1234 0000 0005 11 03 02 0007'), { current: 0 });
    assert.equal(packet.transactionID, 0x1234);
    assert.equal(packet.protocolID, 0);
    assert.equal(packet.unitID, 0x11);
    assert.deepEqual(packet.pdu.value, [7]);
  });
});
