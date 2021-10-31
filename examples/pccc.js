import { TCP, CIP, PCCC } from 'node-drivers';

const tcpLayer = new TCP({ host: '1.2.3.4', port: 44818 });
const cipLayer = new CIP(tcpLayer);
const plc5 = new PCCC(cipLayer);

(async () => {
  try {
    console.log(await plc5.typedRead('N10:47'));
  } catch (err) {
    console.log(err);
  } finally {
    await tcpLayer.close();
  }
})();
