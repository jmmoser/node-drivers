
// const MessageRouter = require('./../src/layers/cip/objects/MessageRouter');
//
// console.log(MessageRouter.ANSIExtSymbolSegment('TotalCount').compare(Buffer.from([
//   0x91, 0x0A, 0x54, 0x6F, 0x74, 0x61, 0x6C, 0x43,
//   0x6F, 0x75, 0x6E, 0x74])) === 0);
//
// console.log(MessageRouter.ANSIExtSymbolSegment('setpoints[5]').compare(Buffer.from([
//   0x91, 0x09, 0x73, 0x65, 0x74, 0x70, 0x6F, 0x69,
//   0x6E, 0x74, 0x73, 0x00, 0x28, 0x05])) === 0);
//
// console.log(MessageRouter.ANSIExtSymbolSegment('ErrorLimit.PRE').compare(Buffer.from([
//   0x91, 0x0A, 0x45, 0x72, 0x72, 0x6F, 0x72, 0x4C,
//   0x69, 0x6D, 0x69, 0x74, 0x91, 0x03, 0x50, 0x52,
//   0x45, 0x00])) === 0);
//
// console.log(MessageRouter.ANSIExtSymbolSegment('myarray[1].today.hourlyCount[3]').compare(Buffer.from([
//   0x91, 0x07, 0x6D, 0x79, 0x61, 0x72, 0x72, 0x61,
//   0x79, 0x00, 0x28, 0x01, 0x91, 0x05, 0x74, 0x6F,
//   0x64, 0x61, 0x79, 0x00, 0x91, 0x0B, 0x68, 0x6F,
//   0x75, 0x72, 0x6C, 0x79, 0x43, 0x6F, 0x75, 0x6E,
//   0x74, 0x00, 0x28, 0x03])) === 0);


const EPath = require('./../src/layers/cip/objects/EPath');

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


(function() {
  console.log(EPath.Encode(0x02, 0x01, 0x01));

  console.log(Buffer.from([
    0x20, // Logical Segment - Class ID
    0x02, // Message Router class
    0x24, // Logical Segment - Instance ID 
    0x01, // Instance ID
    0x30, // Logical Segment - Attribute ID
    0x01  // Attribute 1
  ]));
})();


(function () {
  console.log(EPath.Encode(0x67, 0x01));

  console.log(Buffer.from([
    0x20, // Logical Segment - Class ID
    0x67, // PCCC object
    0x24, // Logical Segment - Instance ID
    0x01
  ]));
})();

(function () {
  console.log(EPath.Encode(0x67, 0xFF82));

  console.log(Buffer.from([
    0x20, // Logical Segment - Class ID
    0x67, // PCCC object
    0x25, // Logical Segment - Instance ID
    0x00, // pad byte
    0x82, // Instance ID least significant byte (LE)
    0xFF  // Instance ID most significant byte byte (LE)
  ]));
})();



(function() {
  const MBFrame = require('../src/layers/modbus/MBFrame');

  const frame = MBFrame.TCP.FromBuffer(Buffer.from([
    0x00, 0x01,
    0x00, 0x00,
    0x00, 0x03,
    0xFF,
    0x84,
    0x00
  ]));

  console.log(frame);

  console.log(frame.toBuffer());
})();


(function() {
  const CIPObject = require('../src/layers/cip/objects/CIPObject');
  console.log(CIPObject.ReservedClassAttributes);
})();


class ABC {
  static a() {
    this.b();
  }

  static b() {
    console.log('it worked!');
  }
}

ABC.a();