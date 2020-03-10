const { TCP, CIP } = require('node-drivers');

const tcpLayer = new TCP({ host: '1.2.3.4', port: 44818 });
const logix5000 = new CIP.Logix5000(tcpLayer);

(async () => {
  try {
    console.log(await logix5000.readTag('R03:9:I.Ch1Data'));
  } catch (err) {
    console.log(err);
  } finally {
    await tcpLayer.close();
  }
})();