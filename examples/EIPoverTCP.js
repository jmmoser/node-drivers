import { TCP, EIP } from 'node-drivers';

const tcpLayer = new TCP({ host: '1.2.3.4', port: 44818 });
const eipLayer = new EIP(tcpLayer);

(async () => {
  try {
    console.log(await eipLayer.listInterfaces());
  } catch (err) {
    console.log(err);
  } finally {
    await tcpLayer.close();
  }
})();
