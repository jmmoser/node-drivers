const assert = require('assert');
const { TCP, Modbus } = require('../../../src/index');

const tcpLayer = new TCP({ host: '127.0.0.1', port: 5020 });
const mbLayer = new Modbus(tcpLayer);

(async () => {
  let error;
  try {
    /** reads holding register 40004 of unit 81 */
    // const value = await mbLayer.readHoldingRegisters(81, 3, 1);
    const value = await mbLayer.readHoldingRegisters(0, 50);
    assert.strictEqual(value, 0, 'Holding register');
  } catch (err) {
    error = err;
  } finally {
    await tcpLayer.close();
  }

  if (error) {
    throw error;
  }
})();
