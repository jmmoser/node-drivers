import PDU from '../pdu';
import { Ref } from '../../../types';

const OFFSET_TRANSACTION_ID = 0;
const OFFSET_PROTOCOL_ID = 2;
const OFFSET_REMAINING_LENGTH = 4;
const OFFSET_UNIT_ID = 6;
const OFFSET_PDU = 7;

const MBAP_HEADER_LENGTH = OFFSET_PDU;

/**
 * ModbusTCP is defraggable
 */
export default class TCP {
  static Decode(buffer: Buffer, offsetRef: Ref) {
    const transactionID = TCP.TransactionID(buffer, offsetRef);
    const protocolID = TCP.ProtocolID(buffer, offsetRef);
    const unitID = TCP.UnitID(buffer, offsetRef);
    const pdu = TCP.PDU(buffer, offsetRef);

    /** transationID, protocolID, and remaining length are 6 bytes total */
    offsetRef.current += 6 + TCP.RemainingLength(buffer, offsetRef);

    return {
      transactionID,
      protocolID,
      unitID,
      pdu,
    };
  }

  static TransactionID(buffer: Buffer, offsetRef: Ref) {
    return buffer.readUInt16BE(offsetRef.current + OFFSET_TRANSACTION_ID);
  }

  static ProtocolID(buffer: Buffer, offsetRef: Ref) {
    return buffer.readUInt16BE(offsetRef.current + OFFSET_PROTOCOL_ID);
  }

  static RemainingLength(buffer: Buffer, offsetRef: Ref) {
    return buffer.readUInt16BE(offsetRef.current + OFFSET_REMAINING_LENGTH);
  }

  static UnitID(buffer: Buffer, offsetRef: Ref) {
    return buffer.readUInt8(offsetRef.current + OFFSET_UNIT_ID);
  }

  static PDU(buffer: Buffer, offsetRef: Ref) {
    return PDU.Decode(
      buffer,
      { current: offsetRef.current + OFFSET_PDU },
      TCP.RemainingLength(buffer, offsetRef) - 1,
      false
    );
  }

  static Encode(transactionID: number, protocolID: number, unitID: number, pdu: Buffer) {
    const buffer = Buffer.allocUnsafe(MBAP_HEADER_LENGTH + pdu.length);
    buffer.writeUInt16BE(transactionID, OFFSET_TRANSACTION_ID);
    buffer.writeUInt16BE(protocolID, OFFSET_PROTOCOL_ID);
    buffer.writeUInt16BE(pdu.length + 1, OFFSET_REMAINING_LENGTH);
    buffer.writeUInt8(unitID, OFFSET_UNIT_ID);
    pdu.copy(buffer, OFFSET_PDU);
    return buffer;
  }

  static Length(buffer: Buffer, offsetRef: Ref) {
    if (buffer.length - offsetRef.current < 7) return -1;
    return 6 + TCP.RemainingLength(buffer, offsetRef);
  }
}
