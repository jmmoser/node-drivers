# node-drivers

A layered approach to protocol drivers.

# Install

```sh
npm install node-drivers
```

# Examples

### Read and list tags from a Logix5000 processor:

```javascript
import { TCP, CIP } from 'node-drivers';

const tcpLayer = new TCP('1.2.3.4');
const logix5000 = new CIP.Logix5000(tcpLayer);

console.log(await logix5000.readTag('tagname'));

/** Read an element from a 1-dimensional tag */
console.log(await logix5000.readTag('TagThatIs1DArray[0]'));

/** Read an entire 1-dimensional tag */
console.log(await logix5000.readTag('TagThatIs1DArray'));

/** Read the first 4 elements of a 1-dimensional tag */
console.log(await logix5000.readTag('TagThatIs1DArray', 4))

/**
 * Read a slice of a 1-dimensional tag
 * example returns an array containing the values of elements 3 through 7
 */
console.log(await logix5000.readTag('TagThatIs1DArray[3]', 5));

/** Read an element of a structure member of a tag */
console.log(await logix5000.readTag('tag.member[0].anothermember'));

/**
 * Read all tags scoped to a program
 * returns an object containing all of the scoped tags
 */
console.log(await logix5000.readTag('TheProgramName'));

/** Read a program scoped tag */
console.log(await logix5000.readTag('TheProgramName.tag'));

/**
 * Read a tag using the symbol instance id
 * (available in controller version 21 and above)
 */
console.log(await logix5000.readTag(2130));

/** List all global tags */
for await (const tag of logix5000.listTags()) {
  console.log(tag);
}

/** List all tags scoped to a program */
for await (const tag of logix5000.listTags('Program:Alarms')) {
  console.log(tag);
}

await tcpLayer.close();
```


### Read/Write a tag from a PLC-5, SLC 5/03, or SLC 5/04 processor using PCCC embedded in CIP:

```javascript
import { TCP, CIP, PCCC } from 'node-drivers';

const tcpLayer = new TCP('1.2.3.4');
const cipLayer = new CIP(tcpLayer);
const pccc = new PCCC(cipLayer);

/** Write an integer */
console.log(await pccc.typedWrite('N10:47', 1000));

/** Read an integer */
console.log(await pccc.typedRead('N10:47'));

/** Write a float */
console.log(await pccc.typedWrite('F8:1', 5.5));

await tcpLayer.close();
```


### Find all EtherNet/IP devices in a subnet using the UDP broadcast address or by explicitly pinging each host:

```javascript
import { UDP, EIP } from 'node-drivers';

const udpLayer = new UDP('1.2.3.255');
const eipLayer = new EIP(udpLayer);

/** Broadcast */
console.log(await eipLayer.listIdentity());


/** Explicitly */
const hosts = [];
for (let i = 1; i < 255; i++) {
  hosts.push(`1.2.3.${i}`);
}

/* hosts overrides whatever host was specified in the Layers.UDP() constructor */
console.log(await eipLayer.listIdentity({ hosts }));

await udpLayer.close();
```


### Retrieve information from an EtherNet/IP device over TCP:

```javascript
import { TCP, EIP } from 'node-drivers';

const tcpLayer = new TCP('1.2.3.4');
const eipLayer = new EIP(tcpLayer);

console.log(await eipLayer.listInterfaces());

console.log(await eipLayer.listServices());

/** no response, used to test underlying transport layer */
await eipLayer.nop();

await tcpLayer.close();
```

### Communicate with a Modbus device over TCP:

```javascript
import { TCP, Modbus } from 'node-drivers';

const tcpLayer = new TCP('1.2.3.4');
const modbusLayer = new Modbus(tcpLayer);

// read holding register 40004
console.log(await modbusLayer.readHoldingRegisters(3, 1));

await tcpLayer.close();
```


# Drivers/Protocols

- CIP
  - EtherNet/IP
  - Logix5000
- PCCC
    - embedded in CIP
- Modbus
    - TCP frame format
- TCP
- UDP
