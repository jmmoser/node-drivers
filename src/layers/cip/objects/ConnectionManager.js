'use strict';

// EIP-CIP-V1 3.5, page 3-53

const { InvertKeyValues } = require('../../../utils');
const CIP = require('./CIP');
const EPath = require('./EPath');
const MessageRouter = require('./MessageRouter');

let ConnectionSerialNumberCounter = 0x0001;
let OtoTNetworkConnectionIDCounter = 0x20000002;
let TtoONetworkConnectionIDCounter = 0x20000001;

function incrementConnectionCounters() {
  ConnectionSerialNumberCounter++;
  OtoTNetworkConnectionIDCounter++;
  TtoONetworkConnectionIDCounter++;
}


class ConnectionManager {
  static UnconnectedSend(message, route, options) {
    options = Object.assign({
      priority: 0,
      timeTick: 7,
      timeoutTicks: 0xE9
    }, options);

    const messageLength = message.length;

    let offset = 0;
    const data = Buffer.allocUnsafe(6 + messageLength + (messageLength % 2) + route.length);

    offset = data.writeUInt8((options.priority << 4 | options.timeTick), offset);
    offset = data.writeUInt8(options.timeoutTicks, offset);
    offset = data.writeUInt16LE(messageLength, offset);
    offset += message.copy(data, offset);
    if (messageLength % 2 === 1) {
      offset = data.writeUInt8(0, offset); /** Pad byte if message length is odd */
    }
    offset = data.writeUInt8(route.length / 2, offset);
    offset = data.writeUInt8(0, offset); /** Reserved */
    offset += route.copy(data, offset);

    return buildRequest(ServiceCodes.UnconnectedSend, data);
  }


  static ForwardOpenRequest(connection, incrementCounters) {
    if (incrementCounters) {
      incrementConnectionCounters();
      connection.ConnectionSerialNumber = ConnectionSerialNumberCounter;
    }
    
    let offset = 0;
    const data = Buffer.alloc(36 + connection.route.length);

    offset = data.writeUInt8(0x0A, offset); // Connection timing Priority (CIP vol 1 Table 3-5.11)
    offset = data.writeUInt8(0x0E, offset); // Time-out, ticks
    offset = data.writeUInt32LE(OtoTNetworkConnectionIDCounter, offset); // Originator to Target Network Connection ID
    offset = data.writeUInt32LE(TtoONetworkConnectionIDCounter, offset); // Target to Originator Network Connection ID
    offset = data.writeUInt16LE(ConnectionSerialNumberCounter, offset);
    offset = data.writeUInt16LE(connection.VendorID, offset);
    offset = data.writeUInt32LE(connection.OriginatorSerialNumber, offset);
    offset = data.writeUInt8(connection.ConnectionTimeoutMultiplier, offset);

    offset = data.writeUInt8(0, offset); /** Reserved */
    offset = data.writeUInt8(0, offset); /** Reserved */
    offset = data.writeUInt8(0, offset); /** Reserved */

    offset = data.writeUInt32LE(connection.OtoTRPI, offset); // Originator to Target requested packet interval (rate), in microseconds
    if (connection.large) {
      offset = data.writeUInt32LE(connection.OtoTNetworkConnectionParameters, offset); // Originator to Target netword connection parameters
    } else {
      offset = data.writeUInt16LE(connection.OtoTNetworkConnectionParameters, offset); // Originator to Target netword connection parameters
    }
    
    offset = data.writeUInt32LE(connection.TtoORPI, offset); // Target to Originator requested packet interval (rate), in microseconds
    
    if (connection.large) {
      offset = data.writeUInt32LE(connection.TtoONetworkConnectionParameters, offset); // Target to Originator network connection parameters
    } else {
      offset = data.writeUInt16LE(connection.TtoONetworkConnectionParameters, offset); // Target to Originator network connection parameters
    }

    offset = data.writeUInt8(connection.TransportClassTrigger, offset); // Transport type/trigger, 0xA3: Direction = Server, Production Trigger = Application Object, Trasport Class = 3
    offset = data.writeUInt8(connection.route.length / 2, offset); // Connection path size
    offset += connection.route.copy(data, offset);

    return buildRequest(
      connection.large ? ServiceCodes.LargeForwardOpen : ServiceCodes.ForwardOpen,
      data
    );
  }


  static ForwardOpenReply(buffer) {
    let offset = 0;
    const res = {};

    res.OtoTNetworkConnectionID = buffer.readUInt32LE(offset); offset += 4;
    res.TtoONetworkConnectionID = buffer.readUInt32LE(offset); offset += 4;
    res.ConnectionSerialNumber = buffer.readUInt16LE(offset); offset += 2;
    res.OriginatorVendorID = buffer.readUInt16LE(offset); offset += 2;
    res.OriginatorSerialNumber = buffer.readUInt32LE(offset); offset += 4;
    res.OtoTActualPacketRate = buffer.readUInt32LE(offset); offset += 4;
    res.TtoOActualPacketRate = buffer.readUInt32LE(offset); offset += 4;
    const applicationReplySize = 2 * buffer.readUInt8(offset); offset += 1;
    offset += 1; // reserved
    res.data = buffer.slice(offset, offset + applicationReplySize); offset += applicationReplySize;

    // console.log('Connection Manager ForwardOpenReply:');
    // console.log(res);
    return res;
  }


  /** CIP Vol 1 3-5.5.3 */
  static ForwardCloseRequest(connection) {
    let offset = 0;
    const data = Buffer.allocUnsafe(12 + connection.route.length);

    offset = data.writeUInt8(0x01, offset); // Connection timing Priority (CIP vol 1 Table 3-5.11)
    offset = data.writeUInt8(0x0E, offset); // Timeout, ticks

    offset = data.writeUInt16LE(connection.ConnectionSerialNumber, offset);
    offset = data.writeUInt16LE(connection.VendorID, offset);
    offset = data.writeUInt32LE(connection.OriginatorSerialNumber, offset);

    offset = data.writeUInt8(connection.route.length / 2, offset); // connection path size, 16-bit words
    offset = data.writeUInt8(0, offset); /** Reserved */
    offset += connection.route.copy(data, offset);

    return buildRequest(ServiceCodes.ForwardClose, data);
  }
  

  static ForwardCloseReply(buffer) {
    let offset = 0;
    const res = {};

    res.SerialNumber = buffer.readUInt16LE(offset); offset += 2;
    res.VendorID = buffer.readUInt16LE(offset); offset += 2;
    res.OriginatorSerialNumber = buffer.readUInt32LE(offset); offset += 4;
    const applicationReplySize = 2 * buffer.readUInt8(offset); offset += 1;
    offset += 1; /** Reserved */
    res.data = buffer.slice(offset, offset + applicationReplySize); offset += applicationReplySize;

    return res;
  }


  /** CIP Vol1 3-5.5.5 */
  static GetConnectionDataRequest(connectionNumber) {
    const data = Buffer.allocUnsafe(2);

    data.writeUInt16LE(connectionNumber, 0);

    return buildRequest(
      ServiceCodes.GetConnectionData,
      data
    );
  }

  /** CIP Vol1 3-5.5.5 */
  static GetConnectionDataResponse(buffer) {
    let offset = 0;
    const res = {};

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

  /** CIP Vol1 3-5.5.6 */
  static SearchConnectionDataRequest(connectionSerialNumber, originatorVendorID, originatorSerialNumber) {
    let offset = 0;
    const data = Buffer.allocUnsafe(8);

    offset = data.writeUInt16LE(connectionSerialNumber, offset);
    offset = data.writeUInt16LE(originatorVendorID, offset);
    offset = data.writeUInt32LE(originatorSerialNumber, offset);

    return buildRequest(ServiceCodes.SearchConnectionData, data);
  }

  /** CIP Vol1 3-5.5.6 */
  static SearchConnectionDataResponse(buffer) {
    return GetConnectionDataResponse(buffer);
  }


  static TranslateResponse(response) {
    if (ServiceCodeSet.has(response.service.code)) {
      response.service.name = ServiceNames[response.service.code] || response.service.name;
      if (response.status.code !== 0) {
        const err = StatusDescriptions[response.status.code];
        switch (typeof err) {
          case 'string':
            response.status.description = err;
            break;
          case 'object':
            if (response.status.extended.length >= 2) {
              const extendedCode = response.status.extended.readUInt16LE(0);
              response.status.description = err[extendedCode] || response.status.description;
            }
            break;
          default:
            break;
        }
      }
    }
  }


  // static GetConnectionOwner() {
  //   let offset = 0;
  //   const data = Buffer.alloc(64);

  //   return buildRequest(
  //     ServiceCodes.GetConnectionOwner,
  //     data.slice(0, offset)
  //   );
  // }
}


module.exports = ConnectionManager;

const ConnectionManager_EPath = EPath.EncodeSegments(true, [
  new EPath.Segments.Logical.ClassID(CIP.Classes.ConnectionManager),
  new EPath.Segments.Logical.InstanceID(0x01)
]);


function buildRequest(code, data) {
  return MessageRouter.Request(
    code,
    ConnectionManager_EPath,
    data
  );
}


/** EIP-CIP-V1 3-5.5, page 3.56 */
const ServiceCodes = {
  ForwardClose: 0x4E, // Closes a connection
  UnconnectedSend: 0x52, // Unconnected send service.  Only originating devices and devices that route between links need to implement.
  ForwardOpen: 0x54, // Opens a connection
  GetConnectionData: 0x56, // For diagnostics of a connection
  SearchConnectionData: 0x57, // For diagnostics of a connection
  GetConnectionOwner: 0x5A, // Determine the owner of a redundant connection
  LargeForwardOpen: 0x5B // Opens a connection, maximum data size is 65535 bytes
};

const ServiceCodeSet = new Set(Object.values(ServiceCodes));

const ServiceNames = InvertKeyValues(ServiceCodes);

ConnectionManager.ServiceCodes = ServiceCodes;

/** CIP Vol 1 Table 3-5.29 */
const StatusDescriptions = {
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
};
