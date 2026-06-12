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
    /** Queued per-request handlers */
    this.handlers = [];
  }

  /**
   * Queue a handler for the next request.
   * handler(requestBuffer, transport) may call transport.deliver()
   * synchronously, asynchronously, or never.
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

  /** Deliver raw bytes to the upper layer, as if received from the network */
  deliver(buffer) {
    this.forward(buffer);
  }

  sendNextMessage() {
    for (;;) {
      const request = this.getNextRequest();
      if (request == null) break;
      this.sent.push(request.message);
      const handler = this.handlers.shift();
      if (handler) handler(request.message, this);
    }
  }
}
