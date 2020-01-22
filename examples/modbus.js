const { TCP, Modbus } = require('node-drivers');

const tcpLayer = new TCP({ host: '1.2.3.4', port: 502 });
const mbLayer = new Modbus(tcpLayer);

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
