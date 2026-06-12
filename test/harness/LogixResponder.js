/**
 * Emulates the CIP connection handshake of a Logix controller on top of
 * a ScriptedTransport, so the Logix5000/CIPConnectionLayer stack can be
 * tested against scripted Message Router responses.
 *
 * - ForwardOpen (0x54) requests are answered with a success response
 *   echoing the connection IDs, serial numbers, and packet rates from
 *   the request.
 * - ForwardClose (0x4E) requests are answered with a success response.
 * - Connected messages (2-byte sequence count + MR request) are matched
 *   against the queued connected handlers in order; the response payload
 *   is sent back with the same sequence count and connection IDs.
 */
export default class LogixResponder {
  constructor(transport) {
    this.transport = transport;
    /** Message Router request buffers from connected messages (sequence stripped) */
    this.connectedRequests = [];
    this.connectedHandlers = [];
    this.forwardOpenRequests = [];
    this.forwardCloseRequests = [];
    this.sendInfo = null;
    transport.respond((message, t, request) => this.handle(message, t, request));
  }

  /** Queue Message Router response payload(s) for the next connected request(s) */
  replyToConnected(...payloads) {
    payloads.forEach((payload) => this.connectedHandlers.push(() => payload));
    return this;
  }

  /** Queue a function (mrRequestBuffer) => responsePayload | null */
  onConnected(handler) {
    this.connectedHandlers.push(handler);
    return this;
  }

  /** Queue a no-response for the next connected request */
  ignoreConnected() {
    return this.onConnected(() => null);
  }

  handle(message, transport, request) {
    if (request.context != null) {
      /** Unconnected Message Router request */
      const service = message.readUInt8(0);
      if (service === 0x54) {
        /**
         * ForwardOpen request layout (after service, path size, 4-byte path):
         * timing(2) @6, OtoT connection ID @8, TtoO connection ID @12,
         * serial(2) vendor(2) originator serial(4) @16,
         * O->T RPI @28, T->O RPI @34
         */
        this.forwardOpenRequests.push(message);
        const data = Buffer.alloc(26);
        message.copy(data, 0, 8, 16); /** echo OtoT + TtoO connection IDs */
        message.copy(data, 8, 16, 24); /** echo serial, vendor, originator serial */
        message.copy(data, 16, 28, 32); /** O->T RPI as actual packet rate */
        message.copy(data, 20, 34, 38); /** T->O RPI as actual packet rate */
        this.sendInfo = {
          connectionID: message.readUInt32LE(8),
          responseID: message.readUInt32LE(12),
        };
        transport.deliver(
          Buffer.concat([Buffer.from([0xD4, 0x00, 0x00, 0x00]), data]),
          null,
          request.context,
        );
      } else if (service === 0x4E) {
        /** ForwardClose: serial(2) vendor(2) originator serial(4) @8 */
        this.forwardCloseRequests.push(message);
        const data = Buffer.alloc(10);
        message.copy(data, 0, 8, 16);
        transport.deliver(
          Buffer.concat([Buffer.from([0xCE, 0x00, 0x00, 0x00]), data]),
          null,
          request.context,
        );
      } else {
        throw new Error(`LogixResponder: unexpected unconnected service 0x${service.toString(16)}`);
      }
      return;
    }

    /** Connected message: 2-byte sequence count + MR request */
    const sequence = message.subarray(0, 2);
    const mrRequest = message.subarray(2);
    this.connectedRequests.push(mrRequest);
    const handler = this.connectedHandlers.shift();
    if (handler) {
      const payload = handler(mrRequest);
      if (payload != null) {
        this.transport.deliver(Buffer.concat([sequence, payload]), this.sendInfo);
      }
    }
  }
}
