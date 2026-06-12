import Layer from '../../src/layers/Layer.js';

/**
 * An in-memory stand-in for the TCP transport layer.
 *
 * Records every buffer upper layers send and replies with scripted
 * responses, so protocol layers can be tested against exact wire bytes
 * without a socket. Incoming bytes are delivered through `forward()`,
 * the same path the real TCP layer uses, so upper-layer defraggers
 * are exercised exactly as in production.
 */
export default class ScriptedTransport extends Layer {
  constructor(name = 'tcp') {
    super(name, null);
    /** Every buffer sent by upper layers, in order */
    this.sent = [];
    /** Every queued request object ({ layer, info, message, context }), in order */
    this.requests = [];
    /** Queued per-request handlers */
    this.handlers = [];
    /** Fallback handler used when no queued handler exists */
    this.responder = null;
  }

  /**
   * Queue a handler for the next request.
   * handler(requestBuffer, transport, requestObject) may call
   * transport.deliver() synchronously, asynchronously, or never.
   */
  onNextRequest(handler) {
    this.handlers.push(handler);
    return this;
  }

  /** Queue raw buffer(s) to deliver upward when the next request arrives */
  reply(...buffers) {
    return this.onNextRequest(() => {
      buffers.forEach((buffer) => this.deliver(buffer));
    });
  }

  /** Queue a no-response for the next request */
  ignoreNextRequest() {
    return this.onNextRequest(() => {});
  }

  /** Set a fallback handler called for any request with no queued handler */
  respond(handler) {
    this.responder = handler;
    return this;
  }

  /** Deliver raw bytes to the upper layer, as if received from the network */
  deliver(buffer, info, context) {
    this.forward(buffer, info, context);
  }

  sendNextMessage() {
    for (;;) {
      const request = this.getNextRequest();
      if (request == null) break;
      this.sent.push(request.message);
      this.requests.push(request);
      const handler = this.handlers.shift() || this.responder;
      if (handler) handler(request.message, this, request);
    }
  }
}
