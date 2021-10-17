const { TCP, CIP } = require('./src/index');

const tcpLayer = new TCP({ host: '127.0.0.1', port: 44818 });
const eipLayer = new CIP.EIP(tcpLayer);

(async () => {
  try {
    const identityResponse = await eipLayer.listIdentity();
    console.log(identityResponse.value.attributes);
  } catch (err) {
    console.log(err);
  } finally {
    await tcpLayer.close();
    console.log('done');
  }
})();
