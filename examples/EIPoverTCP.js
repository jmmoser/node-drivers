const Drivers = require('node-drivers');

const TCPLayer = Drivers.Layers.TCPLayer;
const EIPLayer = Drivers.Layers.EIPLayer;

const tcpLayer = new TCPLayer({ host: '0.0.0.0', port: 44818 });
const eipLayer = new EIPLayer(tcpLayer);

(async () => {
  try {
    const interfaces = await eipLayer.listInterfaces();
    console.log(interfaces);
  } catch (err) {
    console.log(err);
  }

  await tcpLayer.close();
})();