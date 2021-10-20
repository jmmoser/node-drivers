// 'use strict';

// // const Layer = require('../../Layer');
// const CIPLayer = require('../layers/internal/CIPLayer');
// const EPath = require('../core/epath');
// const { ClassCodes } = require('../core/constants');
// const CIPRequest = require('../core/request');
// const { InvertKeyValues } = require('../../../utils');

// const HEADER_LENGTH = 7;

// class PCCC extends CIPLayer {
//   constructor(lowerLayer, options) {
//     // super('pccc.cip', lowerLayer);
//     super(lowerLayer, null, 'pccc.cip');

//     this.options = Object.assign({
//       vendorID: 0xABCD,
//       serialNumber: 0x12345678
//     }, options);

//     const header = Buffer.allocUnsafe(HEADER_LENGTH);
//     header.writeUInt8(HEADER_LENGTH, 0);
//     header.writeUInt16LE(this.options.vendorID, 1);
//     header.writeUInt32LE(this.options.serialNumber, 3);

//     this.header = header;
//   }

//   sendNextMessage() {
//     const request = this.getNextRequest();
//     if (request != null) {
//       const pcccMessage = request.message;

//       const data = Buffer.concat(
//         [this.header, pcccMessage],
//         HEADER_LENGTH + pcccMessage.length
//       );

//       send(this, ServiceCodes.ExecutePCCC, data);

//       setImmediate(() => this.sendNextMessage());
//     }
//   }


//   handleData(data, info, context) {
//     console.log('PCCC HANDLE DATA:');
//     console.log(arguments);
//     // return;

//     if (context) {
//       /** Since this class extends CIPLayer, allow CIPLayer to handle requests like identity() and supportedObjects() */
//       super.handleData(data, info, context);
//       return;
//     }

//     const reply = CIPRequest.Response(data, 0, {
//       serviceNames: ServiceNames
//     });

//     // console.log(reply);

//     if (data.length > 4 && !reply.status.error) {
//       this.forward(reply.data.slice(reply.data.readUInt8(0)), info, context);
//       /** Only ExcutePCCC service supported right now */
//       // if (reply.service.code === ServiceCodes.ExecutePCCC) {
//       //   this.forward(reply.data.slice(reply.data.readUInt8(0)), info, context);
//       // } else {
//       //   console.log(reply);
//       //   console.log(`CIP_PCCCLayer: Unexpected CIP reply service code, ${reply.service.code}. Expected 0x${ServiceCodes.ExecutePCCC.toString(16)}.  This could be a developer error - was another service added?`);
//       // }
//     } else {
//       // console.log('CIP_PCCCLayer: Unexpected PCCC embedded in CIP response:');
//       // console.log(reply);

//       this.destroy(reply.status.name || 'Unexpected PCCC embedded in CIP response');
//     }
//   }
// }

// const PCCC_EPATH = EPath.Encode(true, [
//   new EPath.Segments.Logical.ClassID(ClassCodes.PCCC),
//   new EPath.Segments.Logical.InstanceID(0x01)
// ]);

// /** Use driver specific error handling if exists */
// function send(self, service, data) {
//   const request = new CIPRequest(service, PCCC_EPATH, data);
//   self.send(request.encode(), { connected: false }, false, {
//     request
//   });
// }

// const ServiceCodes = Object.freeze({
//   ExecutePCCC: 0x4B
// });

// const ServiceNames = InvertKeyValues(ServiceCodes);

// module.exports = PCCC;




// // 'use strict';

// // const EPath = require('../../core/epath');
// // const { ClassCodes } = require('../../core/constants');
// // const CIPLayer = require('./CIPLayer');
// // const CIPRequest = require('../../core/request');
// // const { InvertKeyValues } = require('../../../../utils');

// // const HEADER_LENGTH = 7;

// // class PCCC extends CIPLayer {
// //   constructor(lowerLayer, options) {
// //     // super('cip.pccc', lowerLayer);
// //     super(lowerLayer, null, 'pccc.cip')

// //     this.options = Object.assign({
// //       vendorID: 0xABCD,
// //       serialNumber: 0x12345678
// //     }, options);
    
// //     const header = Buffer.allocUnsafe(HEADER_LENGTH);
// //     header.writeUInt8(HEADER_LENGTH, 0);
// //     header.writeUInt16LE(this.options.vendorID, 1);
// //     header.writeUInt32LE(this.options.serialNumber, 3);

// //     this.header = header;
// //   }

// //   sendNextMessage() {
// //     const request = this.getNextRequest();
// //     if (request != null) {
// //       const pcccMessage = request.message;

// //       const data = Buffer.concat(
// //         [this.header, pcccMessage],
// //         HEADER_LENGTH + pcccMessage.length
// //       );

// //       send(this, ServiceCodes.ExecutePCCC, data);

// //       setImmediate(() => this.sendNextMessage());
// //     }
// //   }


// //   handleData(data, info, context) {
// //     if (context) {
// //       /** Since this class extends CIPLayer, allow CIPLayer to handle requests like identity() and supportedObjects() */
// //       super.handleData(data, info, context);
// //       return;
// //     }

// //     const reply = CIPRequest.Response(data, 0, {
// //       serviceNames: ServiceNames
// //     });

// //     if (data.length > 4 && !reply.status.error) {
// //       this.forward(reply.data.slice(reply.data.readUInt8(0)), info, context);
// //       /** Only ExcutePCCC service supported right now */
// //       // if (reply.service.code === ServiceCodes.ExecutePCCC) {
// //       //   this.forward(reply.data.slice(reply.data.readUInt8(0)), info, context);
// //       // } else {
// //       //   console.log(reply);
// //       //   console.log(`CIP_PCCCLayer: Unexpected CIP reply service code, ${reply.service.code}. Expected 0x${ServiceCodes.ExecutePCCC.toString(16)}.  This could be a developer error - was another service added?`);
// //       // }
// //     } else {
// //       console.log('CIP_PCCCLayer: Unexpected PCCC embedded in CIP response:');
// //       console.log(reply);
// //     }
// //   }
// // }

// // const PCCC_EPATH = EPath.Encode(true, [
// //   new EPath.Segments.Logical.ClassID(ClassCodes.PCCC),
// //   new EPath.Segments.Logical.InstanceID(0x01)
// // ]);

// // /** Use driver specific error handling if exists */
// // function send(self, service, data) {
// //   return self.sendRequest(false, new CIPRequest(service, PCCC_EPATH, data));
// // }

// // const ServiceCodes = Object.freeze({
// //   ExecutePCCC: 0x4B
// // });

// // const ServiceNames = InvertKeyValues(ServiceCodes);

// // module.exports = PCCC;
