const Drivers = require('node-drivers');
const TCPLayer = Drivers.Layers.TCPLayer;
const MBLayer = Drivers.Layers.MBTCPLayer;

let tcpLayer = new TCPLayer({ host: '0.0.0.0', port: 502 });
let mbLayer = new MBLayer(tcpLayer);

// read holding register 40004 of unit 81
mbLayer.readHoldingRegisters(81, 3, 1, function(err, res) {
  console.log(res.data[0]);

  tcpLayer.close(function() {
    console.log('closed');
  });
});
