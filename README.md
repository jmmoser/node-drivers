# node-drivers

Supports callbacks and async/await.

# Install

```sh
npm install node-drivers
```

# Examples

### 1. Communicate with a Logix5000 processor:

```javascript
const { Layers } = require('node-drivers');

const tcpLayer = new Layers.TCP({ host: '0.0.0.0', port: 44818 });
const eipLayer = new Layers.EIP(tcpLayer);
const logix5000 = new Layers.CIP.Logix5000(eipLayer);

(async () => {
  try {
      const value = await logix5000.readTag('R03:9:I.Ch1Data');
      console.log(value);
    } catch(err) {
      console.log(err);
    }

    await tcpLayer.close();
  }
})();
```

### 2. Communicate with a PLC-5, SLC 5/03, or SLC 5/04 processor using PCCC embedded in CIP:

```javascript
const { Layers } = require('node-drivers');

const tcpLayer = new Layers.TCP({ host: '0.0.0.0', port: 44818 });
const eipLayer = new Layers.EIP(tcpLayer);
const cipPCCCLayer = new Layers.CIP.PCCC(eipLayer);
const pccc = new Layers.PCCC(cipPCCCLayer);

pccc.typedRead('N10:47', function(err, value) {
  if (err) {
    console.log(err);
  } else {
    console.log(value);
  }

  tcpLayer.close(function() {
    console.log('closed');
  });
});
```

### 3. Find all EtherNet/IP devices in a subnet using the UDP broadcast address:

```javascript
const { Layers } = require('../src');

const udpLayer = new Layers.UDP({ host: '0.0.0.255', port: 44818 });
const eipLayer = new Layers.EIP(udpLayer);

(async () => {
  try {
    const identities = await eipLayer.listIdentity({ timeout: 5000 });
    console.log(identities);
  } catch(err) {
    console.log(err);
  }

  await udpLayer.close();
})();
```

### 4. Find all EtherNet/IP devices in a subnet manually over UDP

```javascript
const { Layers } = require('../src');

/* host does not need to be specified if upper layer messages specify it */
const udpLayer = new Layers.UDP({ port: 44818 });
const eipLayer = new Layers.EIP(udpLayer);

const hosts = [];
for (let i = 2; i < 255; i++) {
  hosts.push(`0.0.0.${i}`);
}

(async () => {
  try {
    /* hosts override whatever host was specified in the Layers.UDP() constructor */
    const identities = await eipLayer.listIdentity({ timeout: 5000, hosts });
    console.log(identities);
  } catch(err) {
    console.log(err);
  }

  await udpLayer.close();
})();
```

### 5. List interfaces of EtherNet/IP device over TCP:

```javascript
const { Layers } = require('../src');

const tcpLayer = new Layers.TCP({ host: '0.0.0.0', port: 44818 });
const eipLayer = new Layers.EIP(tcpLayer);

(async () => {
  try {
    const identities = await eipLayer.listInterfaces();
    console.log(identities);
  } catch(err) {
    console.log(err);
  }

  await tcpLayer.close();
})();
```

### 6. Communicate with a ModbusTCP device:

```javascript
const { Layers } = require('node-drivers');

const tcpLayer = new Layers.TCP({ host: '0.0.0.0', port: 502 });
const mbtcpLayer = new Layers.ModbusTCP(tcpLayer);

// read holding register 40004 of unit 81
mbtcpLayer.readHoldingRegisters(81, 3, 1, function(err, values) {
  if (err) {
    console.log(err);
  } else {
    console.log(values);
  }

  tcpLayer.close(function() {
    console.log('closed');
  });
});
```

# Drivers/Protocols

- Logix5000
- EtherNet/IP
- PCCC embedded in CIP
- ModbusTCP

# Changelog
## 1.5.1 / 2019-04-12
  - CIP.Logix5000 allows reading multiple elements from tags (e.g. logix.readTag('tagname', 2))
    - e.g. logix.readTag('tagname', 2)
    - resolves an array of values if number is greater than 1
## 1.5.0 / 2019-04-12
  - CIP.Logix5000 no longer requires including CIP.Connection as a lower layer.
  - CIP.Connection only connects if needed (e.g. getting all attributes of identity object does not require a connection)