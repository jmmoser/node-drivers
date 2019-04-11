const { Layers } = require('node-drivers');

const tcpLayer = new Layers.TCP({ host: '0.0.0.0', port: 44818 });
const eipLayer = new Layers.EIP(tcpLayer);
const cipConnection = new Layers.CIP.Connection(eipLayer);
const logix5000 = new Layers.CIP.Logix5000(cipConnection);

(async () => {
  try {
    const value = await logix5000.readTag('R03:9:I.Ch1Data');
    console.log(value);
  } catch(err) {
    console.log(err);
  }

  await tcpLayer.close();
})();