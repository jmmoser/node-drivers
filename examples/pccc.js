const Drivers = require('node-drivers');

const TCPLayer = Drivers.Layers.TCPLayer;
const EIPLayer = Drivers.Layers.EIPLayer;
const PCCC = Drivers.Layers.CIP.PCCC;
const PCCCLayer = Drivers.Layers.PCCCLayer;

const tcpLayer = new TCPLayer({ host: '0.0.0.0', port: 44818 });
const eipLayer = new EIPLayer(tcpLayer);
const cipPCCC = new PCCC(eipLayer);
const plc5 = new PCCCLayer(cipPCCC);

plc5.typedRead('N10:47', function(err, value) {
  if (err) {
    console.log(err);
  } else {
    console.log(value);
  }

  tcpLayer.close(function() {
    console.log('closed');
  });
});