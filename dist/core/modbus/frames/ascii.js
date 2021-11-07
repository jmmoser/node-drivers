"use strict";
// export default class ASCII {
//   static Encode(transactionID: number, protocolID, unitID, pdu) {
//     const buffer = Buffer.allocUnsafe(MBAP_HEADER_LENGTH + pdu.length);
//     buffer.writeUInt16BE(transactionID, OFFSET_TRANSACTION_ID);
//     buffer.writeUInt16BE(protocolID, OFFSET_PROTOCOL_ID);
//     buffer.writeUInt16BE(pdu.length + 1, OFFSET_REMAINING_LENGTH);
//     buffer.writeUInt8(unitID, OFFSET_UNIT_ID);
//     pdu.copy(buffer, OFFSET_PDU);
//     return buffer;
//   }
//   static Length(buffer, offsetRef) {
//     if (buffer.length - offsetRef.length < 7) return -1;
//     return 6 + TCP.RemainingLength(buffer, offsetRef);
//   }
// }
