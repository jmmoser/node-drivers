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

describe('Modbus PDU malformed responses', () => {
  /**
   * Every length field inside a response comes off the wire; before
   * bounds-checking was added, each of these threw ERR_OUT_OF_RANGE from
   * the socket data handler (an uncaught exception) instead of producing
   * a decodable error.
   */

  it('flags a register byte count exceeding the received data', () => {
    const pdu = PDU.Decode(hex('03 06 2b'), { current: 0 }, 3);
    assert.match(pdu.error.message, /Malformed/);
    assert.equal(pdu.value, undefined);
  });

  it('flags an odd register byte count', () => {
    const pdu = PDU.Decode(hex('03 03 01 02 03'), { current: 0 }, 5);
    assert.match(pdu.error.message, /Malformed/);
  });

  it('flags a coil byte count exceeding the received data', () => {
    const pdu = PDU.Decode(hex('01 05 cd'), { current: 0 }, 3);
    assert.match(pdu.error.message, /Malformed/);
  });

  it('flags an exception response with no exception code', () => {
    const pdu = PDU.Decode(hex('83'), { current: 0 }, 1);
    assert.match(pdu.error.message, /Malformed/);
  });

  it('flags a truncated write response', () => {
    const pdu = PDU.Decode(hex('06 0001'), { current: 0 }, 3);
    assert.match(pdu.error.message, /Malformed/);
  });

  it('still decodes a valid frame after the checks', () => {
    const pdu = PDU.Decode(hex('01 03 cd 6b 05'), { current: 0 }, 5);
    assert.equal(pdu.error, undefined);
    assert.deepEqual(pdu.value, [0xCD, 0x6B, 0x05]);
  });
});

describe('Modbus constants', () => {
  it('resolves serial-line function names', async () => {
    const constants = await import('../../src/core/modbus/constants.js');
    /** serial-line codes were omitted from FunctionNames, so responses
     * decoded with name 'Unknown'; the export name was also misspelled */
    assert.equal(constants.FunctionNames[0x07], 'ReadExceptionStatus');
    assert.equal(constants.FunctionNames[0x11], 'ReportServerID');
    assert.equal(constants.SerialLineFunctions.Diagnostics, 0x08);
    /** deprecated misspelled alias must keep working */
    assert.equal(constants.SearialLineFunctions, constants.SerialLineFunctions);
  });
});
