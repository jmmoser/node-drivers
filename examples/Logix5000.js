const Drivers = require('node-drivers');

const TCPLayer = Drivers.Layers.TCPLayer;
const EIPLayer = Drivers.Layers.EIPLayer;
const Connection = Drivers.Layers.CIP.Connection;
const Logix5000 = Drivers.Layers.CIP.Logix5000;

let tcpLayer = new TCPLayer({ host: '0.0.0.0', port: 44818 });
let eipLayer = new EIPLayer(tcpLayer);
let connection = new Connection(eipLayer);
let logix5000 = new Logix5000(connection);

logix5000.readTag('R03:9:I.Ch1Data', function(err, value) {
  console.log(value);

  tcpLayer.close(function() {
    console.log('closed');
  });
});
