'use strict';

// const MessageRouter = require('./../src/layers/cip/objects/MessageRouter');
const EPath = require('../src/layers/cip/objects/EPath');


function assert(condition, message) {
  if (!condition) {
    throw Error(message);
  }
}

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
//   /** Port Segments */
//   (() => {
//     const buffer = Buffer.from([0x02, 0x06]);
//     const offset = EPath.Decode(buffer, 0, buffer.length, false, console.log);
//     console.log(offset === buffer.length);
//   })();

//   (() => {
//     const buffer = Buffer.from([0x0F, 0x12, 0x00, 0x01]);
//     const offset = EPath.Decode(buffer, 0, buffer.length, false, console.log);
//     console.log(offset === buffer.length);
//   })();

//   (() => {
//     const buffer = Buffer.from([
//       0x15, 0x0F, 0x31, 0x33, 0x30, 0x2E,
//       0x31, 0x35, 0x31, 0x2E, 0x31, 0x33,
//       0x37, 0x2E, 0x31, 0x30, 0x35, 0x00
//     ]);
//     const offset = EPath.Decode(buffer, 0, buffer.length, false, console.log);
//     console.log(offset === buffer.length);
//   })();
// })();


(() => {
  const ConnectionManager = require('../src/layers/cip/objects/ConnectionManager');

  const options = {
    VendorID: 0x1339,
    OriginatorSerialNumber: 42,
    ConnectionTimeoutMultiplier: 0x01,
    OtoTRPI: 0x00201234,
    OtoTNetworkConnectionParameters: 0x43F4,
    TtoORPI: 0x00204001,
    TtoONetworkConnectionParameters: 0x43F4,
    TransportClassTrigger: 0xA3, // 0xA3: Direction = Server, Production Trigger = Application Object, Trasport Class = 3
    Port: 1,
    Slot: 0
  };

  assert(ConnectionManager.ForwardOpen(options, false, false).equals(Buffer.from([
    0x54, 0x02, 0x20, 0x06, 0x24, 0x01, 0x0a, 0x0e,
    0x02, 0x00, 0x00, 0x20, 0x01, 0x00, 0x00, 0x20,
    0x01, 0x00, 0x39, 0x13, 0x2a, 0x00, 0x00, 0x00,
    0x01, 0x00, 0x00, 0x00, 0x34, 0x12, 0x20, 0x00,
    0xf4, 0x43, 0x01, 0x40, 0x20, 0x00, 0xf4, 0x43,
    0xa3, 0x03, 0x01, 0x00, 0x20, 0x02, 0x24, 0x01
  ])));
})();


(() => {
  const PortSegment = require('../src/layers/cip/objects/EPath/segments/port');

  assert(PortSegment.EncodeSize(2, Buffer.from([0x06])) === 2);
  assert(PortSegment.EncodeSize(2, 6) === 2);
  assert(PortSegment.EncodeSize(2, Buffer.from([0x06])) === 2);
  assert(PortSegment.EncodeSize(2, 6) === 2);
  assert(PortSegment.EncodeSize(18, Buffer.from([0x01])) === 4);
  assert(PortSegment.EncodeSize(5, Buffer.from([
    0x31, 0x33, 0x30, 0x2E,
    0x31, 0x35, 0x31, 0x2E,
    0x31, 0x33, 0x37, 0x2E,
    0x31, 0x30, 0x35
  ])) === 18);

  (() => {
    const number = 0;
    const address = Buffer.from([0x06]);
    const expectedLength = 2;
    const buffer = Buffer.alloc(expectedLength);
    assert(PortSegment.EncodeTo(buffer, 0, number, address) === expectedLength);
    assert(buffer.equals(PortSegment.Encode(number, address)));
  })();

  (() => {
    const number = 0;
    const address = 6
    const expectedLength = 2;
    const buffer = Buffer.alloc(expectedLength);
    assert(PortSegment.EncodeTo(buffer, 0, number, address) === expectedLength);
    assert(buffer.equals(PortSegment.Encode(number, address)));
  })();

  (() => {
    const number = 18;
    const address = 1;
    const expectedLength = 4;
    const buffer = Buffer.alloc(expectedLength);
    assert(PortSegment.EncodeTo(buffer, 0, number, address) === expectedLength);
    assert(buffer.equals(PortSegment.Encode(number, address)));
  })();

  (() => {
    const number = 5;
    const address = Buffer.from([
      0x31, 0x33, 0x30, 0x2E,
      0x31, 0x35, 0x31, 0x2E,
      0x31, 0x33, 0x37, 0x2E,
      0x31, 0x30, 0x35
    ]);
    const expectedLength = 18;

    const buffer = Buffer.alloc(expectedLength);
    assert(PortSegment.EncodeTo(buffer, 0, number, address) === expectedLength);
    assert(buffer.equals(PortSegment.Encode(number, address)));
  })();
})();



(() => {
  /** Logical Segments */
  (() => {
    /** Packed EPATH with 8 bit Class */
    const buffer = Buffer.from([
      0x20, 0x05, 0x24, 0x02, 0x30, 0x01
    ]);
    const offset = EPath.Decode(buffer, 0, buffer.length, false, segments => {
      assert(segments.length === 3);
      assert(segments[0].type.code === 0 && segments[0].format.code === 0 && segments[0].value === 0x05);
      assert(segments[1].type.code === 1 && segments[1].format.code === 0 && segments[1].value === 0x02);
      assert(segments[2].type.code === 4 && segments[2].format.code === 0 && segments[2].value === 0x01);
    });
    assert(offset === buffer.length);
  })();

  (() => {
    /** Packed EPATH with 16 bit Class */
    const buffer = Buffer.from([
      0x21, 0x05, 0x00, 0x24, 0x02, 0x30, 0x01
    ]);
    const offset = EPath.Decode(buffer, 0, buffer.length, false, segments => {
      assert(segments.length === 3);
      assert(segments[0].type.code === 0 && segments[0].format.code === 1 && segments[0].value === 0x05);
      assert(segments[1].type.code === 1 && segments[1].format.code === 0 && segments[1].value === 0x02);
      assert(segments[2].type.code === 4 && segments[2].format.code === 0 && segments[2].value === 0x01);
    });
    assert(offset === buffer.length);
  })();

  (() => {
    /** Padded EPATH with 16 bit Class */
    const buffer = Buffer.from([
      0x21, 0x00, 0x05, 0x00, 0x24, 0x02, 0x30, 0x01
    ]);
    const offset = EPath.Decode(buffer, 0, buffer.length, true, segments => {
      assert(segments.length === 3);
      assert(segments[0].type.code === 0 && segments[0].format.code === 1 && segments[0].value === 0x05);
      assert(segments[1].type.code === 1 && segments[1].format.code === 0 && segments[1].value === 0x02);
      assert(segments[2].type.code === 4 && segments[2].format.code === 0 && segments[2].value === 0x01);
    });
    assert(offset === buffer.length);
  })();

  (() => {
    /** Electronic Key Segment */
    const buffer = Buffer.from([
      0x34,
      0x04,
      0x01, 0x00,
      0x02, 0x00,
      0x03, 0x00,
      0x04,
      0x05
    ]);
    const offset = EPath.Decode(buffer, 0, buffer.length, false, segments => {
      assert(segments.length === 1);
      assert(segments[0].type.code === 5);
      assert(segments[0].format.code === 0);
      assert(segments[0].value.format === 4);
      assert(segments[0].value.vendorID === 1);
      assert(segments[0].value.deviceType === 2);
      assert(segments[0].value.productCode === 3);
      assert(segments[0].value.compatibility === 0);
      assert(segments[0].value.revision.major === 4);
      assert(segments[0].value.revision.minor === 5);
    });
    assert(offset === buffer.length);
  })();

  (() => {
    const buffer = Buffer.from([
      0x20, 0x6C, 0x25, 0x00, 0x52, 0x08, 0x30, 0x01
    ]);
    const offset = EPath.Decode(buffer, 0, buffer.length, true, segments => {
      assert(segments.length === 3);
      assert(segments[0].type.code === 0 && segments[0].value === 0x6C);
      assert(segments[1].type.code === 1 && segments[1].value === 0x0852);
      assert(segments[2].type.code === 4 && segments[2].value === 0x01);
    });
    assert(offset === buffer.length);
  })();
})();


// (() => {
//   /** Symbolic Segments */
//   (() => {
//     /** LS101 */
//     const buffer = Buffer.from([
//       0x65, 0x4c, 0x53, 0x31, 0x30, 0x31
//     ]);
//     const offset = EPath.Decode(buffer, 0, buffer.length, false, console.log);
//     console.log(offset === buffer.length);
//   })();

//   (() => {
//     /** Line_23 */
//     const buffer = Buffer.from([
//       0x67, 0x4c, 0x69, 0x6e, 0x65, 0x5f, 0x32, 0x33
//     ]);
//     const offset = EPath.Decode(buffer, 0, buffer.length, false, console.log);
//     console.log(offset === buffer.length);
//   })();
  
//   (() => {
//     /** Wire_off */
//     const buffer = Buffer.from([
//       0x68, 0x57, 0x69, 0x72, 0x65, 0x5f, 0x6f, 0x66, 0x66
//     ]);
//     const offset = EPath.Decode(buffer, 0, buffer.length, false, console.log);
//     console.log(offset === buffer.length);
//   })();

//   (() => {
//     /** Japanese symbol 1234, 2345 */
//     const buffer = Buffer.from([
//       0x60, 0x22, 0x12, 0x34, 0x23, 0x45
//     ]);
//     const offset = EPath.Decode(buffer, 0, buffer.length, false, console.log);
//     console.log(offset === buffer.length);
//   })();

//   (() => {
//     /** 16 bit Numeric Symbol */
//     const buffer = Buffer.from([
//       0x60, 0xC7, 0x12, 0x34
//     ]);
//     const offset = EPath.Decode(buffer, 0, buffer.length, false, console.log);
//     console.log(offset === buffer.length);
//   })();

//   (() => {
//     /** 32 bit numeric symbol */
//     const buffer = Buffer.from([
//       0x60, 0xC8, 0x12, 0x34, 0x56, 0x78
//     ]);
//     const offset = EPath.Decode(buffer, 0, buffer.length, false, console.log);
//     console.log(offset === buffer.length);
//   })();
// })();


(() => {
  const EPath = require('../src/layers/cip/objects/EPath');

  const symbol = 'n1.n2[1,2]';
  console.log(EPath.EncodeSegments(true, EPath.ConvertSymbolToSegments(symbol)));
  console.log(EPath.EncodeANSIExtSymbol(symbol));

  // const CIP = require('../src/layers/cip/objects/CIP');
  // const buffer = Buffer.from(
  //   [0x01, 0x65, 0x6e, 0x67, 0xDA, 0x01, 0x00, 0x03, 0x61, 0x62, 0x63]
  // );
  // console.log(CIP.Decode(CIP.DataType.STRINGI, buffer, 0, console.log));


  // (() => {
  //   const buffer = Buffer.from([
  //     0xA2, 0x07, 0xC7, 0xA2, 0x03, 0xC7, 0xC2, 0xC3, 0xC3
  //   ]);
  //   const offset = CIP.DecodeDataType(buffer, 0, function (type) {
  //     console.log(JSON.stringify(type, null, 2));
  //   });

  //   console.log(buffer.length, offset);
  // })();

  // (() => {
  //   const buffer = Buffer.from([
  //     0xA0, 0x02, 0xC7, 0x26
  //   ]);
  //   const offset = CIP.DecodeDataType(buffer, 0, function (type) {
  //     console.log(JSON.stringify(type, null, 2));
  //   });

  //   console.log(buffer.length, offset);
  // })();

  // (() => {
  //   const buffer = Buffer.from([
  //     0xA3, 0x13, 0x80, 0x01, 0x00, 0x81, 0x01, 0x13,
  //     0xA3, 0x0B, 0x80, 0x01, 0x00, 0x81, 0x01, 0xFF,
  //     0xA2, 0x03, 0xC7, 0xC2, 0xC3
  //   ]);
  //   const offset = CIP.DecodeDataType(buffer, 0, function (type) {
  //     console.log(JSON.stringify(type, null, 2));
  //   });

  //   console.log(buffer.length, offset);
  // })();

  // (() => {
  //   const buffer = Buffer.from([
  //     0xA1, 0x06, 0xA1, 0x04, 0xA0, 0x02, 0x59, 0x51
  //   ]);
  //   const offset = CIP.DecodeDataType(buffer, 0, function (type) {
  //     console.log(JSON.stringify(type, null, 2));
  //   });

  //   console.log(buffer.length, offset);
  // })();
})();



// (() => {
//   const CIP = require('../src/layers/cip/objects/CIP');
//   const EPath = require('../src/layers/cip/objects/EPath');
//   const MessageRouter = require('../src/layers/cip/objects/MessageRouter');
//   const ConnectionManager = require('../src/layers/cip/objects/ConnectionManager');

//   const request = MessageRouter.Request(
//     CIP.CommonServices.GetAttributesAll,
//     EPath.EncodeSegments(true, [
//       new EPath.Segments.Logical.ClassID(CIP.Classes.Identity),
//       new EPath.Segments.Logical.InstanceID(0x01)
//     ])
//   );

//   const routePath = Buffer.from([
//     0x01,
//     0x00
//   ]);

//   console.log(ConnectionManager.UnconnectedSend(request, routePath));
// })();


(() => {
  const CIP = require('../src/layers/cip/objects/CIP');
  const EPath = require('../src/layers/cip/objects/EPath');
  // const MessageRouter = require('../src/layers/cip/objects/MessageRouter');
  // const ConnectionManager = require('../src/layers/cip/objects/ConnectionManager');

  assert(EPath.EncodeSegments(true, [
    new EPath.Segments.Logical.ClassID(CIP.Classes.MessageRouter),
    new EPath.Segments.Logical.InstanceID(1),
  ]).equals(Buffer.from([0x20, 0x02, 0x24, 0x01])));

  assert(EPath.EncodeSegments(true, [
    new EPath.Segments.Port(1, 0),
    new EPath.Segments.Logical.ClassID(CIP.Classes.MessageRouter),
    new EPath.Segments.Logical.InstanceID(1),
  ]).equals(Buffer.from([0x01, 0x00, 0x20, 0x02, 0x24, 0x01])));


  // console.log(EPath.Decode(Buffer.from([0x02, 0x09, 0x04, 0x06]), 0, true, false, console.log));
  console.log(EPath.Decode(Buffer.from([0x2C, 0x01]), 0, true, false, console.log));
  // console.log(EPath.Decode(EPath.Segments.Logical.SpecialNormalElectronicKey(1, 2, 3, 4, 5, 0).encode(true), 0, null, true, console.log));

  // console.log(EPath.EncodeSegments(true, [
  //   new EPath.Segments.Port(1, 0),
  //   EPath.Segments.Logical.ClassID(CIP.Classes.MessageRouter),
  //   EPath.Segments.Logical.InstanceID(1),
  // ]));
})();




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


console.log('success');