'use strict';

// EIP-CIP-V1 3.5, page 3-53

const MessageRouter = require('./MessageRouter');

let ConnectionSerialNumberCounter = 0x0001;
let OtoTNetworkConnectionIDCounter = 0x20000002;
let TtoONetworkConnectionIDCounter = 0x20000001;

function incrementNetworkConnectionCounters() {
  ConnectionSerialNumberCounter++;
  OtoTNetworkConnectionIDCounter++;
  TtoONetworkConnectionIDCounter++;
}

class ConnectionManager {
  // constructor(options) {
  //
  //   if (!opts) opts = {};
  //
  //   super(opts);
  //
  //   this.ProcessorSlot = opts.ProcessorSlot || 0;
  //   this.SerialNumber = opts.SerialNumber || 0x1234;
  //   this.VendorID = opts.VendorID || 0x1337;
  //   this.OriginatorSerialNumber = opts.OriginatorSerialNumber || 42;
  //
  //   // this.ConnectionPath = Buffer.from([0x20, 0x02, 0x24, 0x01]);
  // }

  CommonServices() {
    return [0x01, 0x0E, 0x10];
  }

  UnconnectedSend() {
    // 0x52
  }

  // EIP-CIP-V1 3-5.5.3, pg. 3-65
  static ForwardClose(connection) {
    // let offset = 0;
    // let buffer = Buffer.alloc(256);
    //
    // buffer.writeUInt8(Services.ForwardClose, offset); offset += 1;
    // buffer.writeUInt8(2, offset); offset += 1; // path size
    // buffer.writeUInt8(0x20, offset); offset += 1; // logical segment, class ID, 8-bit address
    // buffer.writeUInt8(ConnectionManager.Code, offset); offset += 1; // class ID
    // buffer.writeUInt8(0x24, offset); offset += 1; // logical segment, instance ID, 8-bit address
    // buffer.writeUInt8(0x01, offset); offset += 1; // instance ID
    //
    //
    //
    // buffer.writeUInt8(0x01, offset); offset += 1; // Connection timing Priority (CIP vol 1 Table 3-5.11)
    // buffer.writeUInt8(0x0E, offset); offset += 1; // Timeout, ticks
    //
    // buffer.writeUInt16LE(connection.ConnectionSerialNumber, offset); offset += 2;
    // buffer.writeUInt16LE(connection.VendorID, offset); offset += 2;
    // buffer.writeUInt32LE(connection.OriginatorSerialNumber, offset); offset += 4;
    //
    // buffer.writeUInt8(3, offset); offset += 1; // connection path size, 16-bit words
    // offset += 1; // reserved
    // buffer.writeUInt8(0x01, offset); offset += 1; // port segment
    // buffer.writeUInt8(connection.ProcessorSlot, offset); offset += 1;
    // buffer.writeUInt8(0x20, offset); offset += 1; // logical segment, class ID, 8-bit address
    // buffer.writeUInt8(0x02, offset); offset += 1; // class ID (MessageRouter)
    // buffer.writeUInt8(0x24, offset); offset += 1; // logical segment, instance ID, 8-bit address
    // buffer.writeUInt8(0x01, offset); offset += 1; // instance ID
    // return buffer.slice(0, offset);


    let offset = 0;
    let data = Buffer.alloc(64);

    data.writeUInt8(0x01, offset); offset += 1; // Connection timing Priority (CIP vol 1 Table 3-5.11)
    data.writeUInt8(0x0E, offset); offset += 1; // Timeout, ticks

    data.writeUInt16LE(connection.ConnectionSerialNumber, offset); offset += 2;
    data.writeUInt16LE(connection.VendorID, offset); offset += 2;
    data.writeUInt32LE(connection.OriginatorSerialNumber, offset); offset += 4;

    data.writeUInt8(0x03, offset); offset += 1; // connection path size, 16-bit words
    offset += 1; // reserved
    // Padded EPATH
    data.writeUInt8(0x01, offset); offset += 1; // port segment
    data.writeUInt8(connection.ProcessorSlot, offset); offset += 1;
    data.writeUInt8(0x20, offset); offset += 1; // logical segment, class ID, 8-bit address
    data.writeUInt8(0x02, offset); offset += 1; // class ID (MessageRouter)
    data.writeUInt8(0x24, offset); offset += 1; // logical segment, instance ID, 8-bit address
    data.writeUInt8(0x01, offset); offset += 1; // instance ID

    return ConnectionManager._Request(
      Services.ForwardClose,
      data.slice(0, offset)
    );
  }

  static ForwardCloseReply(buffer) {
    let offset = 0;
    let response = {};

    response.SerialNumber = buffer.readUInt16LE(offset); offset += 2;
    response.VendorID = buffer.readUInt16LE(offset); offset += 2;
    response.OriginatorSerialNumber = buffer.readUInt32LE(offset); offset += 4;
    let applicationReplySize = 2 * buffer.readUInt8(offset); offset += 1;
    offset += 1;
    if (applicationReplySize > 0) response.Data = buffer.slice(offset, offset + applicationReplySize); offset += applicationReplySize;

    return response;
  }

  static ForwardOpen(connection) {
    incrementNetworkConnectionCounters();

    connection.ConnectionSerialNumber = ConnectionSerialNumberCounter;

    // // 0x54
    // let offset = 0;
    // let buffer = Buffer.alloc(256);
    // buffer.writeUInt8(Services.ForwardOpen, offset); offset += 1;
    // buffer.writeUInt8(2, offset); offset += 1; // path size
    // buffer.writeUInt8(0x20, offset); offset += 1; // logical segment, class ID, 8-bit logical address
    // buffer.writeUInt8(ConnectionManager.Code, offset); offset += 1; // class ID
    // buffer.writeUInt8(0x24, offset); offset += 1; // logical segment, instance ID, 8-bit logical address
    // buffer.writeUInt8(0x01, offset); offset += 1; // instance ID,
    //
    // buffer.writeUInt8(0x0A, offset); offset += 1; // Connection timing Priority (CIP vol 1 Table 3-5.11)
    // buffer.writeUInt8(0x0E, offset); offset += 1; // Time-out, ticks
    // buffer.writeUInt32LE(OtoTNetworkConnectionIDCounter, offset); offset += 4; // Originator to Target Network Connection ID
    // buffer.writeUInt32LE(TtoONetworkConnectionIDCounter, offset); offset += 4; // Target to Originator Network Connection ID
    // buffer.writeUInt16LE(ConnectionSerialNumberCounter, offset); offset += 2; // Connection Serial Number
    // buffer.writeUInt16LE(connection.VendorID, offset); offset += 2;
    // buffer.writeUInt32LE(connection.OriginatorSerialNumber, offset); offset += 4;
    // buffer.writeUInt8(connection.ConnectionTimeoutMultiplier, offset); offset += 1; // connection timeout multiplier
    // offset += 3; // reserved
    //
    // buffer.writeUInt32LE(connection.OtoTRPI, offset); offset += 4; // Originator to Target requested packet interval (rate), in microseconds
    // buffer.writeUInt16LE(connection.OtoTNetworkConnectionParameters, offset); offset += 2; // Originator to Target netword connection parameters
    // buffer.writeUInt32LE(connection.TtoORPI, offset); offset += 4; // Target to Originator requested packet interval (rate), in microseconds
    // buffer.writeUInt16LE(connection.TtoONetworkConnectionParameters, offset); offset += 2; // Target to Originator network connection parameters
    //
    // buffer.writeUInt8(connection.TransportClassTrigger, offset); offset += 1; // Transport type/trigger, 0xA3: Direction = Server, Production Trigger = Application Object, Trasport Class = 3
    //
    // buffer.writeUInt8(0x03, offset); offset += 1; // Connection path size
    // buffer.writeUInt8(0x01, offset); offset += 1; // Port identifier
    // buffer.writeUInt8(connection.ProcessorSlot, offset); offset += 1;
    // buffer.writeUInt8(0x20, offset); offset += 1; // logical segment, class ID, 8-bit logical address
    // buffer.writeUInt8(0x02, offset); offset += 1; // class ID (MessageRouter)
    // buffer.writeUInt8(0x24, offset); offset += 1; // logical segment, instance ID, 8-bit logical address
    // buffer.writeUInt8(0x01, offset); offset += 1; // instance ID
    //
    // return buffer.slice(0, offset);

    let offset = 0;
    let data = Buffer.alloc(64);

    data.writeUInt8(0x0A, offset); offset += 1; // Connection timing Priority (CIP vol 1 Table 3-5.11)
    data.writeUInt8(0x0E, offset); offset += 1; // Time-out, ticks
    data.writeUInt32LE(OtoTNetworkConnectionIDCounter, offset); offset += 4; // Originator to Target Network Connection ID
    data.writeUInt32LE(TtoONetworkConnectionIDCounter, offset); offset += 4; // Target to Originator Network Connection ID
    data.writeUInt16LE(ConnectionSerialNumberCounter, offset); offset += 2; // Connection Serial Number
    data.writeUInt16LE(connection.VendorID, offset); offset += 2;
    data.writeUInt32LE(connection.OriginatorSerialNumber, offset); offset += 4;
    data.writeUInt8(connection.ConnectionTimeoutMultiplier, offset); offset += 1; // connection timeout multiplier
    offset += 3; // reserved

    data.writeUInt32LE(connection.OtoTRPI, offset); offset += 4; // Originator to Target requested packet interval (rate), in microseconds
    data.writeUInt16LE(connection.OtoTNetworkConnectionParameters, offset); offset += 2; // Originator to Target netword connection parameters
    data.writeUInt32LE(connection.TtoORPI, offset); offset += 4; // Target to Originator requested packet interval (rate), in microseconds
    data.writeUInt16LE(connection.TtoONetworkConnectionParameters, offset); offset += 2; // Target to Originator network connection parameters

    data.writeUInt8(connection.TransportClassTrigger, offset); offset += 1; // Transport type/trigger, 0xA3: Direction = Server, Production Trigger = Application Object, Trasport Class = 3

    data.writeUInt8(0x03, offset); offset += 1; // Connection path size
    data.writeUInt8(0x01, offset); offset += 1; // Port identifier
    data.writeUInt8(connection.ProcessorSlot, offset); offset += 1;
    data.writeUInt8(0x20, offset); offset += 1; // logical segment, class ID, 8-bit logical address
    data.writeUInt8(0x02, offset); offset += 1; // class ID (MessageRouter)
    data.writeUInt8(0x24, offset); offset += 1; // logical segment, instance ID, 8-bit logical address
    data.writeUInt8(0x01, offset); offset += 1; // instance ID

    return ConnectionManager._Request(
      Services.ForwardOpen,
      data.slice(0, offset)
    );
  }

  static ForwardOpenReply(buffer) {
    let offset = 0;
    let res = {};

    res.OtoTNetworkConnectionID = buffer.readUInt32LE(offset); offset += 4;
    res.TtoONetworkConnectionID = buffer.readUInt32LE(offset); offset += 4;
    res.ConnectionSerialNumber = buffer.readUInt16LE(offset); offset += 2;
    res.OriginatorVendorID = buffer.readUInt16LE(offset); offset += 2;
    res.OriginatorSerialNumber = buffer.readUInt32LE(offset); offset += 4;
    res.OtoTActualPacketRate = buffer.readUInt32LE(offset); offset += 4;
    res.TtoOActualPacketRate = buffer.readUInt32LE(offset); offset += 4;
    let appReplySize = 2 * buffer.readUInt8(offset); offset += 1;
    offset += 1; // reserved
    if (appReplySize > 0) {
      res.Data = buffer.slice(offset, offset + appReplySize); offset += appReplySize;
    }
    return res;
  }

  // CIP Vol1 3-5.5.5
  static GetConnectionDataRequest(connectionNumber) {
    let data = Buffer.alloc(2);

    data.writeUInt16LE(connectionNumber, 0);

    return ConnectionManager._Request(
      Services.GetConnectionData,
      data
    );
  }

  // CIP Vol1 3-5.5.5
  static GetConnectionDataResponse(buffer) {
    let offset = 0;
    let res = {};

    res.ConnectionNumber = buffer.readUInt16LE(offset); offset += 2;
    res.ConnectionState = buffer.readUInt16LE(offset); offset += 2;
    res.OriginatorPort = buffer.readUInt16LE(offset); offset += 2;
    res.TargetPort = buffer.readUInt16LE(offset); offset += 2;
    res.ConnectionSerialNumber = buffer.readUInt16LE(offset); offset += 2;
    res.OriginatorVendorID = buffer.readUInt16LE(offset); offset += 2;
    res.OriginatorSerialNumber = buffer.readUInt32LE(offset); offset += 4;
    res.OriginatorOtoTCID = buffer.readUInt32LE(offset); offset += 4;
    res.TargetOtoTCID = buffer.readUInt32LE(offset); offset += 4;
    res.ConnectionTimeoutMultiplierOtoT = buffer.readUInt8(offset); offset += 1;
    offset += 3; // Reserved
    res.OriginatorRPIOtoT = buffer.readUInt32LE(offset); offset += 4;
    res.OriginatorAPIOtoT = buffer.readUInt32LE(offset); offset += 4;
    res.OriginatorTtoOCID = buffer.readUInt32LE(offset); offset += 4;
    res.TargetTtoOCID = buffer.readUInt32LE(offset); offset += 4;
    res.ConnectionTimeoutMultiplierTtoO = buffer.readUInt8(offset); offset += 1;
    offset += 3; // Reserved
    res.OriginatorRPITtoO = buffer.readUInt32LE(offset); offset += 4;
    res.OriginatorAPITtoO = buffer.readUInt32LE(offset); offset += 4;

    return res;
  }

  // CIP Vol1 3-5.5.6
  static SearchConnectionDataRequest(connectionSerialNumber, originatorVendorID, originatorSerialNumber) {
    let offset = 0;
    let data = Buffer.alloc(8);

    data.writeUInt16LE(connectionSerialNumber, offset); offset += 2;
    data.writeUInt16LE(originatorVendorID, offset); offset += 2;
    data.writeUInt32LE(originatorSerialNumber, offset); offset += 4;

    return ConnectionManager._Request(
      Services.SearchConnectionData,
      data
    );
  }

  // CIP Vol1 3-5.5.6
  static SearchConnectionDataResponse(buffer) {
    return GetConnectionDataResponse(buffer);
  }

  static GetConnectionOwner() {
    let offset = 0;
    let data = Buffer.alloc(64);

    return ConnectionManager._Request(
      Services.GetConnectionOwner,
      data.slice(0, offset)
    );
  }

  static _Request(code, data) {
    return MessageRouter.Request(
      code,
      ConnectionManager.Path,
      data
    );
  }
}

ConnectionManager.Code = 0x06;

ConnectionManager.Path = Buffer.from([
  0x20, // logical segment, class ID, 8-bit logical address
  ConnectionManager.Code, // Class ID
  0x24, // logical segment, instance ID, 8-bit logical address
  0x01 // instance ID
]);

module.exports = ConnectionManager;

ConnectionManager.CommonServices = [
  0x01,
  0x0E
];

// EIP-CIP-V1 3-5.5, page 3.56
const Services = {
  ForwardClose: 0x4E, // Closes a connection
  UnconnectedSend: 0x52, // Unconnected send service.  Only originating devices and devices that route between links need to implement.
  ForwardOpen: 0x54, // Opens a connection
  GetConnectionData: 0x56, // For diagnostics of a connection
  SearchConnectionData: 0x57, // For diagnostics of a connection
  GetConnectionOwner: 0x5A, // Determine the owner of a redundant connection
  LargeForwardOpen: 0x5B // Opens a connection, maximum data size is 65535 bytes
};

ConnectionManager.Services = Services;

// CIP Vol 1 Table 3-5.29
ConnectionManager.StatusDescriptions = {
  0x01: {
    0x0100: 'Connection in use or duplicate forward open', // see 3-5.5.2
    // 0x0101: 'Reserved',
    // 0x0102: 'Reserved',
    0x0103: 'Transport class and trigger combination not supported',
    // 0x0104: 'Reserved',
    // 0x0105: 'Reserved',
    0x0106: 'Ownership conflict',
    0x0107: 'Target connection not found',
    0x0108: 'Invalid network connection parameter',
    0x0109: 'Invalid connection size',
    // 0x010A: 'Reserved',
    // 0x010F: 'Reserved',
    0x0110: 'Target for connection not configured',
    0x0111: 'RPI not supported',
    // 0x0112: 'Reserved'
    0x0113: 'Out of connections',
    0x0114: 'Vendor ID or product code mismatch',
    0x0115: 'Product type mismatch',
    0x0116: 'Revision mismatch',
    0x0117: 'Invalid produced or consumed application path',
    0x0118: 'Invalid or inconsistent configuration application path',
    0x0119: 'Non-listen only connection not opened',
    0x011A: 'Target object out of connections',
    0x011B: 'RPI is smaller than the production inhibit time',
    0x011C: 'Reserved',
    0x0202: 'Reserved',
    0x0203: 'Connection timed out',
    0x0204: 'Unconnected request timed out',
    0x0205: 'Parameter error in unconnected request service',
    0x0206: 'Message too large for unconnected_send service',
    0x0207: 'Unconnected acknowledge without reply',
    // 0x0208: 'Reserved',
    // 0x0300: 'Reserved',
    0x0301: 'No buffer memory available',
    0x0302: 'Network bandwidth not available for data',
    0x0303: 'No consumed connection ID filter available',
    0x0304: 'Not configured to send scheduled priority data',
    0x0305: 'Schedule signature mismatch',
    0x0306: 'Schedule signature validation not possible',
    // 0x0307: 'Reserved',
    // 0x0310: 'Reserved',
    0x0311: 'Port not available',
    0x0312: 'Link address not valid',
    // 0x0313: 'Reserved',
    // 0x0314: 'Reserved',
    0x0315: 'Invalid segment in connection path',
    0x0316: 'Error in forward close service connection path',
    0x0317: 'Scheduling not specified',
    0x0318: 'Link address to self invalid',
    0x0319: 'Secondary resources unavailable',
    0x031A: 'Rack connection already established',
    0x031B: 'Module connection already established',
    0x031C: 'Miscellaneous',
    0x031D: 'Redundant connection mismatch',
    0x031E: 'No more user configurable link consumer resources available in the producing module',
    0x031F: 'No user configurable link consumer resources available in the producing module',
    0x0320: 'Vendor specific',
    0x07FF: 'Vendor specific',
    0x0800: 'Network link in path to module is offline',
    // 0x0801: 'Reserved',
    // 0x080F: 'Reserved',
    0x0810: 'No target application data available',
    0x0811: 'No originator application data available',
    0x0812: 'Node address has changed since the network was scheduled',
    0x0813: 'Not configured for off-subnet multicast',
    // 0x0814: 'Reserved',
    // 0xFCFF: 'Reserved'
  },
  0x09: 'Error in data segment',
  0x0C: 'Object state error',
  0x10: 'Device state error'
}
