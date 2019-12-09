# node-drivers

A layered approach to protocol drivers.

# Install

```sh
npm install node-drivers
```

# Examples

### Read a tag from a Logix5000 processor:

```javascript
const { TCP, EIP, CIP } = require('node-drivers').Layers;

const tcpLayer = new TCP('1.2.3.4');
const eipLayer = new EIP(tcpLayer);
const logix5000 = new CIP.Logix5000(eipLayer);

const value = await logix5000.readTag('R03:9:I.Ch1Data');
console.log(value);

await tcpLayer.close();
```

### List all tags in a Logix5000 processor:

```javascript
const { TCP, EIP, CIP } = require('node-drivers').Layers;

const tcpLayer = new TCP('1.2.3.4');
const eipLayer = new EIP(tcpLayer);
const logix5000 = new CIP.Logix5000(eipLayer);

for await (const tag of logix5000.listTags()) {
  console.log(tag);
}

await tcpLayer.close();
```

### Read a tag from a PLC-5, SLC 5/03, or SLC 5/04 processor using PCCC embedded in CIP:

```javascript
const { TCP, EIP, CIP, PCCC } = require('node-drivers').Layers;

const tcpLayer = new TCP('1.2.3.4');
const eipLayer = new EIP(tcpLayer);
const cipPCCCLayer = new CIP.PCCC(eipLayer);
const pccc = new PCCC(cipPCCCLayer);

const value = await pccc.typedRead('N10:47');
console.log(value);

await tcpLayer.close();
```

### Find all EtherNet/IP devices in a subnet using the UDP broadcast address:

```javascript
const { UDP, EIP } = require('node-drivers').Layers;

const udpLayer = new UDP('1.2.3.255');
const eipLayer = new EIP(udpLayer);

const identities = await eipLayer.listIdentity({ timeout: 5000 });
console.log(identities);

await udpLayer.close();
```


### Find all EtherNet/IP devices in a subnet manually over UDP

```javascript
const { UDP, EIP } = require('node-drivers').Layers;

/* host does not need to be specified if upper layer messages specify it */
const udpLayer = new UDP();
const eipLayer = new EIP(udpLayer);

const hosts = [];
for (let i = 2; i < 255; i++) {
  hosts.push(`1.2.3.${i}`);
}

/* hosts overrides whatever host was specified in the Layers.UDP() constructor */
const identities = await eipLayer.listIdentity({ timeout: 5000, hosts });
console.log(identities);

await udpLayer.close();
```


### List interfaces of EtherNet/IP device over TCP:

```javascript
const { TCP, EIP } = require('node-drivers').Layers;

const tcpLayer = new TCP('1.2.3.4');
const eipLayer = new EIP(tcpLayer);

const identities = await eipLayer.listInterfaces();
console.log(identities);

await tcpLayer.close();
```

### Communicate with a Modbus device over TCP:

```javascript
const { TCP, Modbus } = require('node-drivers').Layers;

const tcpLayer = new TCP('1.2.3.4');
const modbusLayer = new Modbus(tcpLayer);

// read holding register 40004
const registers = await modbusLayer.readHoldingRegisters(3, 1);
console.log(registers);

await tcpLayer.close();
```

# Drivers/Protocols

- Logix5000
- EtherNet/IP
- PCCC
    - embedded in CIP
- Modbus
    - TCP frame format
- TCP
- UDP
