const { Layers } = require('node-drivers');

const tcpLayer = new Layers.TCP({ host: '0.0.0.0', port: 44818 });
const eipLayer = new Layers.EIP(tcpLayer);

(async () => {
  try {
    const interfaces = await eipLayer.listInterfaces();
    console.log(interfaces);
  } catch (err) {
    console.log(err);
  }

  await tcpLayer.close();
})();