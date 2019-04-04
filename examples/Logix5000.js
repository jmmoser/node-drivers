const Drivers = require('node-drivers');

const TCPLayer = Drivers.Layers.TCPLayer;
const EIPLayer = Drivers.Layers.EIPLayer;
const Connection = Drivers.Layers.CIP.Connection;
const Logix5000 = Drivers.Layers.CIP.Logix5000;

const tcpLayer = new TCPLayer({ host: '0.0.0.0', port: 44818 });
const eipLayer = new EIPLayer(tcpLayer);
const connection = new Connection(eipLayer);
const logix5000 = new Logix5000(connection);

(async () => {
  try {
    const value = await logix5000.readTag('R03:9:I.Ch1Data');
    console.log(value);
  } catch(err) {
    console.log(err);
  }

  await tcpLayer.close();
})();