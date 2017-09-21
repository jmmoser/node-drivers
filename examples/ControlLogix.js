const Drivers = require('node-drivers');

const TCPLayer = Drivers.Layers.TCPLayer;
const EIPLayer = Drivers.Layers.EIPLayer;
const Connection = Drivers.CIP.Connection;
const ControlLogix = Drivers.CIP.ControlLogix;

let tcpLayer = new TCPLayer({ host: '0.0.0.0', port: 44818 });
let eipLayer = new EIPLayer(tcpLayer);
let connection = new Connection(eipLayer);
let controlLogix = new ControlLogix(connection);

controlLogix.ReadTag('R03:9:I.Ch1Data', function(err, value) {
  console.log(value);

  tcpLayer.close(function() {
    console.log('closed');
  });
});
