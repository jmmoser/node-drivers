import { TCP, Modbus } from 'node-drivers';

const tcpLayer = new TCP({ host: '1.2.3.4', port: 502 });
const mbLayer = new Modbus(tcpLayer);

(async () => {
  try {
    /** reads holding register 40004 */
    console.log(await mbLayer.readHoldingRegisters(3, 1));
  } catch (err) {
    console.log(err);
  } finally {
    await tcpLayer.close();
  }
})();
