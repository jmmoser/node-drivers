const { UDP, CIP } = require('node-drivers');

const udpLayer = new UDP({ host: '0.0.0.255', port: 44818 });
const eipLayer = new CIP.EIP(udpLayer);

(async () => {
  try {
    /**
     * Broadcast ListIdentity command over UDP
     */
    console.log(await eipLayer.listIdentity());
  } catch (err) {
    console.log(err);
  } finally {
    await udpLayer.close();
  }
})();