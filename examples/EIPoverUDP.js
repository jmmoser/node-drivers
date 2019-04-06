const Drivers = require('node-drivers');

const UDPLayer = Drivers.Layers.UDPLayer;
const EIPLayer = Drivers.Layers.EIPLayer;

const udpLayer = new UDPLayer({ host: '0.0.0.255', port: 44818 });
const eipLayer = new EIPLayer(udpLayer);

(async () => {
  try {
    /**
     * Broadcast ListIdentity command over UDP
     * and listen for responses for 3 seconds
     */
    const interfaces = await eipLayer.listIdentity(3000);
    console.log(interfaces);
  } catch (err) {
    console.log(err);
  }

  await udpLayer.close();
})();