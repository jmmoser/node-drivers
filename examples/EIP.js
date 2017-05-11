const Drivers = require('node-drivers');

const TCPLayer = Drivers.Layers.TCPLayer;
const EIPLayer = Drivers.Layers.EIPLayer;

let tcpLayer = new TCPLayer({ host: '0.0.0.0', port: 44818 });
let eipLayer = new EIPLayer(tcpLayer);

eipLayer.ListInterfaces(function(res) {
  console.log(res);

  tcpLayer.close(function() {
    console.log('closed');
  });
});
