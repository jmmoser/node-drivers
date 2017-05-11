const Drivers = require('node-drivers');

const TCPLayer = Drivers.Layers.TCPLayer;
const EIPLayer = Drivers.Layers.EIPLayer;
const CIPLayer = Drivers.Layers.CIPLayer;
const ControlLogix = Drivers.CIP.ControlLogix;

let tcpLayer = new TCPLayer({ host: '0.0.0.0', port: 44818 });
let eipLayer = new EIPLayer(tcpLayer);
let cipLayer = new CIPLayer(eipLayer);
let controlLogix = new ControlLogix(cipLayer);

controlLogix.ReadTag('R03:9:I.Ch1Data', function(err, value) {
  console.log(value);

  tcpLayer.close(function() {
    console.log('closed');
  });
});
