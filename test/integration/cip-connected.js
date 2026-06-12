import assert from 'assert';
import { TCP, CIP } from '../../src/index.js';

/**
 * Exercises connected class-3 explicit messaging against a real
 * third-party CIP stack (OpENer): ForwardOpen through the
 * CIPConnectionLayer, a connected GetAttributeSingle on the Identity
 * object, and ForwardClose on shutdown.
 *
 * This validates the same handshake and sequenced-message framing the
 * Logix5000 unit tests emulate with the LogixResponder harness.
 */

const EPath = CIP.Core.EPath.default;
const CIPRequest = CIP.Core.Request.default;

const tcpLayer = new TCP({ host: '127.0.0.1', port: 44818 });
const cipLayer = new CIP(tcpLayer);

(async () => {
  let error;
  try {
    /** GetAttributeSingle: Identity object (0x01), instance 1, attribute 1 (Vendor ID) */
    const path = EPath.Encode(true, [
      new EPath.Segments.Logical.ClassID(0x01),
      new EPath.Segments.Logical.InstanceID(0x01),
      new EPath.Segments.Logical.AttributeID(0x01),
    ]);

    const reply = await cipLayer.sendRequest(true, new CIPRequest(0x0E, path), null, 5000);
    assert.strictEqual(reply.status.code, 0, 'GetAttributeSingle status');
    assert.strictEqual(reply.data.readUInt16LE(0), 1, 'Vendor ID (OpENer reports 1)');

    /** a second request must reuse the connection with the next sequence count */
    const reply2 = await cipLayer.sendRequest(true, new CIPRequest(0x0E, path), null, 5000);
    assert.strictEqual(reply2.status.code, 0, 'second connected request status');
  } catch (err) {
    error = err;
  } finally {
    await tcpLayer.close();
  }

  if (error) {
    throw error;
  } else {
    console.log('cip connected messaging success'); // eslint-disable-line no-console
  }
})();
