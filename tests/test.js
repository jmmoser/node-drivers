
// const MessageRouter = require('./../src/layers/cip/objects/MessageRouter');
const EPath = require('./../src/layers/cip/objects/EPath');

// console.log(EPath.EncodeANSIExtSymbol('TotalCount').compare(Buffer.from([
//   0x91, 0x0A, 0x54, 0x6F, 0x74, 0x61, 0x6C, 0x43,
//   0x6F, 0x75, 0x6E, 0x74])) === 0);
//
// console.log(EPath.EncodeANSIExtSymbol('setpoints[5]').compare(Buffer.from([
//   0x91, 0x09, 0x73, 0x65, 0x74, 0x70, 0x6F, 0x69,
//   0x6E, 0x74, 0x73, 0x00, 0x28, 0x05])) === 0);
//
// console.log(EPath.EncodeANSIExtSymbol('ErrorLimit.PRE').compare(Buffer.from([
//   0x91, 0x0A, 0x45, 0x72, 0x72, 0x6F, 0x72, 0x4C,
//   0x69, 0x6D, 0x69, 0x74, 0x91, 0x03, 0x50, 0x52,
//   0x45, 0x00])) === 0);


// (() => {
//   const path = EPath.EncodeANSIExtSymbol('myarray[1].today.hourlyCount[3]');
//   const expectedPath = Buffer.from([
//     0x91, 0x07, 0x6D, 0x79, 0x61, 0x72, 0x72, 0x61,
//     0x79, 0x00, 0x28, 0x01, 0x91, 0x05, 0x74, 0x6F,
//     0x64, 0x61, 0x79, 0x00, 0x91, 0x0B, 0x68, 0x6F,
//     0x75, 0x72, 0x6C, 0x79, 0x43, 0x6F, 0x75, 0x6E,
//     0x74, 0x00, 0x28, 0x03]);
//   // console.log(path);
//   // console.log(expectedPath);
//   console.log(path.compare(expectedPath) === 0);
// })();


// (() => {
//   const PCCCPacket = require('../src/layers/pccc/PCCCPacket');
//   // console.log(PCCCPacket.WordRangeReadRequest(1, 'F8:1'));
//   // const writeRequest = PCCCPacket.TypedWriteRequest(3, 'F8:1', [1000.0, 0, -5.5]);
//   // const writeRequest = PCCCPacket.TypedWriteRequest(3, 'F8:1', 1000.0);
//   const writeRequest = PCCCPacket.TypedWriteRequest(3, 'N7:10', [1000.0, 0, 5.5]);
//   // console.log(PCCCPacket.TypedWriteRequest(3, 'F8:1', [1000.0, 0, -5.5]));
//   // console.log(PCCCPacket.TypedWriteRequest(3, 'F8:1', [1000.0, 0, -5.5]));
//   // console.log(require('../src/utils').getBit(0x94, 7));
//   // console.log(require('../src/utils').getBits(0x94, 4, 7));

//   // const readBuffer = Buffer.from([
//   //   0x92, 0x09, 0x94, 0x08, 0x00, 0x00, 0x7a, 0x44, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xb0, 0xc0
//   // ]);

//   console.log(writeRequest);

//   const readBuffer = writeRequest.slice(17);
//   console.log(readBuffer);

//   console.log(PCCCPacket.ParseTypedReadData(readBuffer, 0));
// })();

(() => {
  const CIP = require('../src/layers/cip/objects/CIP');

  (() => {
    const buffer = Buffer.from([
      0xA2, 0x07, 0xC7, 0xA2, 0x03, 0xC7, 0xC2, 0xC3, 0xC3
    ]);
    const offset = CIP.DecodeDataType(buffer, 0, function (type) {
      console.log(JSON.stringify(type, null, 2));
    });

    console.log(buffer.length, offset);
  })();

  (() => {
    const buffer = Buffer.from([
      0xA0, 0x02, 0xC7, 0x26
    ]);
    const offset = CIP.DecodeDataType(buffer, 0, function (type) {
      console.log(JSON.stringify(type, null, 2));
    });

    console.log(buffer.length, offset);
  })();

  (() => {
    const buffer = Buffer.from([
      0xA3, 0x13, 0x80, 0x01, 0x00, 0x81, 0x01, 0x13,
      0xA3, 0x0B, 0x80, 0x01, 0x00, 0x81, 0x01, 0xFF,
      0xA2, 0x03, 0xC7, 0xC2, 0xC3
    ]);
    const offset = CIP.DecodeDataType(buffer, 0, function (type) {
      console.log(JSON.stringify(type, null, 2));
    });

    console.log(buffer.length, offset);
  })();

  (() => {
    const buffer = Buffer.from([
      0xA1, 0x06, 0xA1, 0x04, 0xA0, 0x02, 0x59, 0x51
    ]);
    const offset = CIP.DecodeDataType(buffer, 0, function (type) {
      console.log(JSON.stringify(type, null, 2));
    });

    console.log(buffer.length, offset);
  })();
  
})();



// (() => {
//   const CIP = require('../src/layers/cip/objects/CIP');
//   const EPath = require('../src/layers/cip/objects/EPath');
//   const MessageRouter = require('../src/layers/cip/objects/MessageRouter');
//   const ConnectionManager = require('../src/layers/cip/objects/ConnectionManager');

//   const request = MessageRouter.Request(
//     CIP.CommonServices.GetAttributesAll,
//     EPath.Encode(CIP.Classes.Identity, 0x01)
//   );

//   const routePath = Buffer.from([
//     0x01,
//     0x00
//   ]);

//   console.log(ConnectionManager.UnconnectedSend(request, routePath));
// })();



// console.log(EPath.ParsePath(Buffer.from([0x02, 0x06])));
// console.log(EPath.ParsePath(Buffer.from([0x0F, 0x12, 0x00, 0x01])));
// console.log(EPath.ParsePath(Buffer.from([
//   0x15, 0x0F, 0x31, 0x33, 0x30, 0x2E, 0x31, 0x35,
//   0x31, 0x2E, 0x31, 0x33, 0x37, 0x2E, 0x31, 0x30,
//   0x35, 0x00
// ])));

// console.log(EPath.DescribeSegments(EPath.ParsePath(Buffer.from([0x02, 0x06]))));
// console.log(EPath.DescribeSegments(EPath.ParsePath(Buffer.from([0x0F, 0x12, 0x00, 0x01]))));
// console.log(EPath.DescribeSegments(EPath.ParsePath(Buffer.from([
//   0x15, 0x0F, 0x31, 0x33, 0x30, 0x2E, 0x31, 0x35,
//   0x31, 0x2E, 0x31, 0x33, 0x37, 0x2E, 0x31, 0x30,
//   0x35, 0x00
// ]))));

// console.log('1')
// console.log(EPath.ParsePath(Buffer.from([
//   0x20, // Logical Segment - Class ID
//   0x02, // Message Router class
//   0x24, // Logical Segment - Instance ID 
//   0x01, // Instance ID
//   0x30, // Logical Segment - Attribute ID
//   0x01  // Attribute 1
// ])));
// console.log(EPath.ParsePath(Buffer.from([0x20, 0x6B, 0x25, 0x00, 0x00, 0x00])));
// console.log(EPath.DescribeSegments(EPath.ParsePath(Buffer.from([0x20, 0x6B, 0x25, 0x00, 0x00, 0x00]))));
// console.log('2')


// (function() {
//   console.log(EPath.Encode(0x02, 0x01, 0x01));

//   console.log(Buffer.from([
//     0x20, // Logical Segment - Class ID
//     0x02, // Message Router class
//     0x24, // Logical Segment - Instance ID 
//     0x01, // Instance ID
//     0x30, // Logical Segment - Attribute ID
//     0x01  // Attribute 1
//   ]));
// })();


// (function () {
//   console.log(EPath.Encode(0x67, 0x01));

//   console.log(Buffer.from([
//     0x20, // Logical Segment - Class ID
//     0x67, // PCCC object
//     0x24, // Logical Segment - Instance ID
//     0x01
//   ]));
// })();

// (function () {
//   console.log(EPath.Encode(0x67, 0xFF82));

//   console.log(Buffer.from([
//     0x20, // Logical Segment - Class ID
//     0x67, // PCCC object
//     0x25, // Logical Segment - Instance ID
//     0x00, // pad byte
//     0x82, // Instance ID least significant byte (LE)
//     0xFF  // Instance ID most significant byte byte (LE)
//   ]));
// })();



// (function() {
//   const MBFrame = require('../src/layers/modbus/MBFrame');

//   const frame = MBFrame.TCP.FromBuffer(Buffer.from([
//     0x00, 0x01,
//     0x00, 0x00,
//     0x00, 0x03,
//     0xFF,
//     0x84,
//     0x00
//   ]));

//   console.log(frame);

//   console.log(frame.toBuffer());
// })();


// (function() {
//   const CIPObject = require('../src/layers/cip/objects/CIPObject');
//   console.log(CIPObject.ReservedClassAttributes);
// })();