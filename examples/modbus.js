const { TCP, Modbus } = require('node-drivers');

const tcpLayer = new TCP({ host: '1.2.3.4', port: 502 });
const mbLayer = new Modbus(tcpLayer);

(async () => {
  try {
    /** reads holding register 40004 of unit 81 */
    console.log(await mbLayer.readHoldingRegisters(81, 3, 1));
  } catch (err) {
    console.log(err);
  } finally {
    await tcpLayer.close();
  }
})();
