import assert from 'assert';
import { TCP, EIP } from '../../src/index.js';

const tcpLayer = new TCP({ host: '127.0.0.1', port: 44818 });
const eipLayer = new EIP(tcpLayer);

(async () => {
  let error;
  try {
    const identityResponse = await eipLayer.listIdentity();
    assert.strictEqual(identityResponse.value.attributes[0].value.code, 1, 'Vendor ID');
    assert.strictEqual(identityResponse.value.attributes[1].value.code, 12, 'Device Type');
    assert.strictEqual(identityResponse.value.attributes[2].value, 65001, 'Product Code');
  } catch (err) {
    error = err;
  } finally {
    await tcpLayer.close();
  }

  if (error) {
    throw error;
  } else {
    console.log('eip success'); // eslint-disable-line no-console
  }
})();
