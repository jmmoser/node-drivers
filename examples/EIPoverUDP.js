const Drivers = require('node-drivers');

const UDPLayer = Drivers.Layers.UDPLayer;
const EIPLayer = Drivers.Layers.EIPLayer;

const udpLayer = new UDPLayer({ host: '0.0.0.0', port: 44818 });
const eipLayer = new EIPLayer(udpLayer);

(async () => {
  try {
    const interfaces = await eipLayer.ListInterfaces();
    console.log(interfaces);
  } catch (err) {
    console.log(err);
  }

  await udpLayer.close();
})();