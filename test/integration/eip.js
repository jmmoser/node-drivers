const assert = require('assert');
const { TCP, CIP } = require('../../src/index');

const tcpLayer = new TCP({ host: '127.0.0.1', port: 44818 });
const eipLayer = new CIP.EIP(tcpLayer);

(async () => {
  let error;
  try {
    const identityResponse = await eipLayer.listIdentity();
    assert.strictEqual(identityResponse.value.attributes[0].value.id, 1, 'Vendor ID');
    assert.strictEqual(identityResponse.value.attributes[1].value.code, 12, 'Device Type');
    assert.strictEqual(identityResponse.value.attributes[2].value, 65001, 'Product Code');
  } catch (err) {
    error = err;
  } finally {
    await tcpLayer.close();
  }

  if (error) {
    throw error;
  }
})();
