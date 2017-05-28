const Drivers = require('node-drivers');

const TCPLayer = Drivers.Layers.TCPLayer;
const EIPLayer = Drivers.Layers.EIPLayer;
const CIPLayer = Drivers.Layers.CIPLayer;
const PCCC = Drivers.CIP.PCCC;
const PCCCLayer = Drivers.Layers.PCCCLayer;

let tcpLayer = new TCPLayer({ host: '0.0.0.0', port: 44818 });
let eipLayer = new EIPLayer(tcpLayer);
let cipLayer = new CIPLayer(eipLayer);
let pcccObject = new PCCC(cipLayer);
let pcccLayer = new PCCCLayer(pcccObject);

pcccLayer.typedRead('N10:47', function(err, value) {
  console.log(value);

  tcpLayer.close(function() {
    console.log('closed');
  });
});
