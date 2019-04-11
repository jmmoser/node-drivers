const { Layers } = require('node-drivers');

const tcpLayer = new Layers.TCP({ host: '0.0.0.0', port: 502 });
const mbLayer = new Layers.ModbusTCP(tcpLayer);

// read holding register 40004 of unit 81
mbLayer.readHoldingRegisters(81, 3, 1, function(err, values) {
  if (err) {
    console.log(err);
  } else {
    console.log(values);
  }

  tcpLayer.close(function() {
    console.log('closed');
  });
});
