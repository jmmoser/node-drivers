const { Layers } = require('node-drivers');

const tcpLayer = new Layers.TCP({ host: '0.0.0.0', port: 44818 });
const eipLayer = new Layers.EIP(tcpLayer);
const cipPCCCLayer = new Layers.CIP.PCCC(eipLayer);
const plc5 = new Layers.PCCC(cipPCCCLayer);

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