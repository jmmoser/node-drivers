const { Layers } = require('node-drivers');

const udpLayer = new Layers.UDP({ host: '0.0.0.255', port: 44818 });
const eipLayer = new Layers.EIP(udpLayer);

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