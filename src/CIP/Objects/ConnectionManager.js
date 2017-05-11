'use strict';

// EIP-CIP-V1 3.5, page 3-53

// const CIPObject = require('./CIPObject');

let ConnectionSerialNumberCounter = 0x0001;
let OtoTNetworkConnectionIDCounter = 0x20000002;
let TtoONetworkConnectionIDCounter = 0x20000001;

function incrementNetworkConnectionCounters() {
  ConnectionSerialNumberCounter++;
  OtoTNetworkConnectionIDCounter++;
  TtoONetworkConnectionIDCounter++;
}

// class ConnectionManager extends CIPObject {
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
    // 0x4E
    let offset = 0;
    let buffer = Buffer.alloc(256);

    buffer.writeUInt8(Services.ForwardClose, offset); offset += 1;
    buffer.writeUInt8(2, offset); offset += 1; // path size
    buffer.writeUInt8(0x20, offset); offset += 1; // logical segment, class ID, 8-bit address
    buffer.writeUInt8(ConnectionManager.Code, offset); offset += 1; // class ID
    buffer.writeUInt8(0x24, offset); offset += 1; // logical segment, instance ID, 8-bit address
    buffer.writeUInt8(0x01, offset); offset += 1; // instance ID
    buffer.writeUInt8(0x01, offset); offset += 1; // Priority
    buffer.writeUInt8(0x0E, offset); offset += 1; // Time-out, ticks
    buffer.writeUInt16LE(connection.ConnectionSerialNumber || 0x1234, offset); offset += 2;
    buffer.writeUInt16LE(connection.VendorID || 0x1337, offset); offset += 2;
    buffer.writeUInt32LE(connection.OriginatorSerialNumber || 42, offset); offset += 4;

    buffer.writeUInt8(3, offset); offset += 1; // connection path, Padded EPATH
    offset += 1; // reserved
    buffer.writeUInt8(0x01, offset); offset += 1; // port segment
    buffer.writeUInt8(connection.ProcessorSlot || 0, offset); offset += 1;
    buffer.writeUInt8(0x20, offset); offset += 1; // logical segment, class ID, 8-bit address
    buffer.writeUInt8(0x02, offset); offset += 1; // class ID (MessageRouter)
    buffer.writeUInt8(0x24, offset); offset += 1; // logical segment, instance ID, 8-bit address
    buffer.writeUInt8(0x01, offset); offset += 1; // instance ID
    return buffer.slice(0, offset);
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

  // EIP-CIP-V1 Table 3-5.9, pg. 3-63
  // static ForwardOpen(cipObject, options) {
  static ForwardOpen(connection) {
    incrementNetworkConnectionCounters();

    connection.ConnectionSerialNumber = ConnectionSerialNumberCounter;

    // 0x54
    let offset = 0;
    let buffer = Buffer.alloc(256);
    buffer.writeUInt8(Services.ForwardOpen, offset); offset += 1;
    buffer.writeUInt8(2, offset); offset += 1; // path size
    buffer.writeUInt8(0x20, offset); offset += 1; // logical segment, class ID, 8-bit logical address
    buffer.writeUInt8(ConnectionManager.Code, offset); offset += 1; // class ID
    buffer.writeUInt8(0x24, offset); offset += 1; // logical segment, instance ID, 8-bit logical address
    buffer.writeUInt8(0x01, offset); offset += 1; // instance ID,
    buffer.writeUInt8(0x0A, offset); offset += 1; // Priority
    buffer.writeUInt8(0x0E, offset); offset += 1; // Time-out, ticks
    buffer.writeUInt32LE(OtoTNetworkConnectionIDCounter, offset); offset += 4; // Originator to Target Network Connection ID
    buffer.writeUInt32LE(TtoONetworkConnectionIDCounter, offset); offset += 4; // Target to Originator Network Connection ID
    buffer.writeUInt16LE(ConnectionSerialNumberCounter, offset); offset += 2; // Connection Serial Number
    buffer.writeUInt16LE(connection.VendorID || 0x1337, offset); offset += 2;
    buffer.writeUInt32LE(connection.OriginatorSerialNumber || 42, offset); offset += 4;
    buffer.writeUInt8(connection.ConnectionTimeoutMultiplier || 0x03, offset); offset += 1; // connection timeout multiplier
    offset += 3; // reserved

    buffer.writeUInt32LE(connection.OtoTRPI || 0x00201234, offset); offset += 4; // Originator to Target requested packet interval (rate), in microseconds
    buffer.writeUInt16LE(connection.OtoTNetworkConnectionParameters || 0x43F4, offset); offset += 2; // Originator to Target netword connection parameters
    buffer.writeUInt32LE(connection.TtoORPI || 0x00204001, offset); offset += 4; // Target to Originator requested packet interval (rate), in microseconds
    buffer.writeUInt16LE(connection.TtoONetworkConnectionParameters || 0x43F4, offset); offset += 2; // Target to Originator network connection parameters

    buffer.writeUInt8(connection.TransportClassTrigger, offset); offset += 1; // Transport type/trigger

    buffer.writeUInt8(0x03, offset); offset += 1; // Connection path size
    buffer.writeUInt8(0x01, offset); offset += 1; // Port identifier
    buffer.writeUInt8(connection.ProcessorSlot || 0, offset); offset += 1;
    buffer.writeUInt8(0x20, offset); offset += 1; // logical segment, class ID, 8-bit logical address
    buffer.writeUInt8(0x02, offset); offset += 1; // class ID (MessageRouter)
    buffer.writeUInt8(0x24, offset); offset += 1; // logical segment, instance ID, 8-bit logical address
    buffer.writeUInt8(0x01, offset); offset += 1; // instance ID

    return buffer.slice(0, offset);
  }

  static ForwardOpenReply(buffer) {
    let offset = 0;
    let response = {};

    response.OtoTNetworkConnectionID = buffer.readUInt32LE(offset); offset += 4;
    response.TtoONetworkConnectionID = buffer.readUInt32LE(offset); offset += 4;
    response.ConnectionSerialNumber = buffer.readUInt16LE(offset); offset += 2;
    response.OriginatorVendorID = buffer.readUInt16LE(offset); offset += 2;
    response.OriginatorSerialNumber = buffer.readUInt32LE(offset); offset += 4;
    response.OtoTActualPacketRate = buffer.readUInt32LE(offset); offset += 4;
    response.TtoOActualPacketRate = buffer.readUInt32LE(offset); offset += 4;
    let applicationReplySize = 2 * buffer.readUInt8(offset); offset += 1;
    offset += 1; // reserved
    if (applicationReplySize > 0) response.Data = buffer.slice(offset, offset + applicationReplySize); offset += applicationReplySize;
    return response;
  }

  GetConnectionData() {
    // 0x56
  }

  SearchConnectionData() {
    // 0x57
  }

  GetConnectionOwner() {
    // 0x5A
  }
}

ConnectionManager.Code = 0x06;

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
  GetConnectionOwner: 0x5A // Determine the owner of a redundant connection
};

ConnectionManager.Services = Services;
