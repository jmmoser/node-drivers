// EIP-CIP-V1 3.5, page 3-53
import { ClassCodes } from '../constants/index';
import CIPRequest, { CIPResponseHandler, CIPResponse } from '../request';
import EPath from '../epath/index';
import { Ref } from '../../../types';
import Connection from './Connection';

/** EIP-CIP-V1 3-5.5, page 3.56 */
enum ServiceCodes {
  ForwardClose = 0x4E, // Closes a connection
  UnconnectedSend = 0x52, // Unconnected send service
  ForwardOpen = 0x54, // Opens a connection
  GetConnectionData = 0x56, // For diagnostics of a connection
  SearchConnectionData = 0x57, // For diagnostics of a connection
  GetConnectionOwner = 0x5A, // Determine the owner of a redundant connection
  LargeForwardOpen = 0x5B, // Opens a connection, maximum data size is 65535 bytes
};

const ServiceCodeSet = new Set(Object.values(ServiceCodes));

/** CIP Vol 1 Table 3-5.29 */
const StatusDescriptions: { [key: number]: string | { [key: number]: string }} = {
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
  0x10: 'Device state error',
};

const ConnectionManagerEPath = EPath.Encode(true, [
  new EPath.Segments.Logical(EPath.Segments.Logical.Types.ClassID, ClassCodes.ConnectionManager),
  new EPath.Segments.Logical(EPath.Segments.Logical.Types.InstanceID, 0x01),
]);

function ConnectionManagerCIPRequest(service: number, data: Buffer, responseDecoder: CIPResponseHandler) {
  return new CIPRequest(service, ConnectionManagerEPath, data, responseDecoder, {
    serviceNames: ServiceCodes,
  });
}

let ConnectionSerialNumberCounter = 0x0001;
let OtoTNetworkConnectionIDCounter = 0x20000002;
let TtoONetworkConnectionIDCounter = 0x20000001;

function incrementConnectionCounters() {
  ConnectionSerialNumberCounter++;
  OtoTNetworkConnectionIDCounter++;
  TtoONetworkConnectionIDCounter++;
}

function encodeConnectionTiming(buffer: Buffer, offset: number, tickTime: number, timeoutTicks: number) {
  const priority = 0; // 1 is reserved, keep for future
  offset = buffer.writeUInt8(((priority << 4) | (tickTime & 0b1111)), offset);
  offset = buffer.writeUInt8(timeoutTicks, offset);
  return offset;
}

function errorDataHandler(buffer: Buffer, offsetRef: Ref, res: { status: { type: string }, remainingPathSize?: number }) {
  if (res.status.type === 'routing') {
    res.remainingPathSize = buffer.readUInt8(offsetRef.current); offsetRef.current += 1;

    if (offsetRef.current < buffer.length) {
      if (buffer.readUInt8(offsetRef.current) === 0) {
        /** TODO: confirm possible pad byte? */
        offsetRef.current += 1;
      }
    }
  }
}

interface ConnectionDataResponse {
  ConnectionNumber: number;
  ConnectionState: number;
  OriginatorPort: number;
  TargetPort: number;
  ConnectionSerialNumber: number;
  OriginatorVendorID: number;
  OriginatorSerialNumber: number;
  OriginatorOtoTCID: number;
  TargetOtoTCID: number;
  ConnectionTimeoutMultiplierOtoT: number;
  OriginatorRPIOtoT: number;
  OriginatorAPIOtoT: number;
  OriginatorTtoOCID: number;
  TargetTtoOCID: number;
  ConnectionTimeoutMultiplierTtoO: number;
  OriginatorRPITtoO: number;
  OriginatorAPITtoO: number;
}

function connectionDataResponse(buffer: Buffer, offsetRef: Ref): ConnectionDataResponse {
  const ConnectionNumber = buffer.readUInt16LE(offsetRef.current); offsetRef.current += 2;
  const ConnectionState = buffer.readUInt16LE(offsetRef.current); offsetRef.current += 2;
  const OriginatorPort = buffer.readUInt16LE(offsetRef.current); offsetRef.current += 2;
  const TargetPort = buffer.readUInt16LE(offsetRef.current); offsetRef.current += 2;
  const ConnectionSerialNumber = buffer.readUInt16LE(offsetRef.current); offsetRef.current += 2;
  const OriginatorVendorID = buffer.readUInt16LE(offsetRef.current); offsetRef.current += 2;
  const OriginatorSerialNumber = buffer.readUInt32LE(offsetRef.current); offsetRef.current += 4;
  const OriginatorOtoTCID = buffer.readUInt32LE(offsetRef.current); offsetRef.current += 4;
  const TargetOtoTCID = buffer.readUInt32LE(offsetRef.current); offsetRef.current += 4;
  const ConnectionTimeoutMultiplierOtoT = buffer.readUInt8(offsetRef.current); offsetRef.current += 1;
  offsetRef.current += 3; // Reserved
  const OriginatorRPIOtoT = buffer.readUInt32LE(offsetRef.current); offsetRef.current += 4;
  const OriginatorAPIOtoT = buffer.readUInt32LE(offsetRef.current); offsetRef.current += 4;
  const OriginatorTtoOCID = buffer.readUInt32LE(offsetRef.current); offsetRef.current += 4;
  const TargetTtoOCID = buffer.readUInt32LE(offsetRef.current); offsetRef.current += 4;
  const ConnectionTimeoutMultiplierTtoO = buffer.readUInt8(offsetRef.current); offsetRef.current += 1;
  offsetRef.current += 3; // Reserved
  const OriginatorRPITtoO = buffer.readUInt32LE(offsetRef.current); offsetRef.current += 4;
  const OriginatorAPITtoO = buffer.readUInt32LE(offsetRef.current); offsetRef.current += 4;

  return {
    ConnectionNumber,
    ConnectionState,
    OriginatorPort,
    TargetPort,
    ConnectionSerialNumber,
    OriginatorVendorID,
    OriginatorSerialNumber,
    OriginatorOtoTCID,
    TargetOtoTCID,
    ConnectionTimeoutMultiplierOtoT,
    OriginatorRPIOtoT,
    OriginatorAPIOtoT,
    OriginatorTtoOCID,
    TargetTtoOCID,
    ConnectionTimeoutMultiplierTtoO,
    OriginatorRPITtoO,
    OriginatorAPITtoO,
  };
}

interface UnconnectedSendOptions {
  tickTime: number;
  timeoutTicks: number;
}

export default class ConnectionManager {
  static ServiceCodes = ServiceCodes;

  static UnconnectedSend(request: CIPRequest, route: Buffer, options?: UnconnectedSendOptions) {
    const opts = {
      tickTime: 6,
      timeoutTicks: 156,
      ...options,
    };

    const requestSize = request.encodeSize();

    let offset = 0;
    const buffer = Buffer.allocUnsafe(6 + requestSize + (requestSize % 2) + route.length);

    offset = encodeConnectionTiming(buffer, offset, opts.tickTime, opts.timeoutTicks);
    offset = buffer.writeUInt16LE(requestSize, offset);
    offset = request.encodeTo(buffer, offset);
    if (requestSize % 2 === 1) {
      offset = buffer.writeUInt8(0, offset); /** Pad byte if message length is odd */
    }
    offset = buffer.writeUInt8(route.length / 2, offset);
    offset = buffer.writeUInt8(0, offset); /** Reserved */
    route.copy(buffer, offset);

    return new CIPRequest(
      ServiceCodes.UnconnectedSend,
      ConnectionManagerEPath,
      buffer,
      request,
      {
        serviceNames: ServiceCodes,
        acceptedServiceCodes: [ServiceCodes.UnconnectedSend, request.service],
        statusHandler: (statusCode: number, extendedBuffer: Buffer) => {
          switch (statusCode) {
            case 1:
              if (extendedBuffer.length === 2) {
                switch (extendedBuffer.readUInt16LE(0)) {
                  case 0x0204:
                    return {
                      name: 'Unconnected Send Error',
                      description: 'Timeout',
                      type: 'timeout',
                    };
                  case 0x0311:
                    return {
                      name: 'Unconnected Send Error',
                      description: 'Invalid Port ID specified in the route path field.',
                      type: 'routing',
                    };
                  case 0x0312:
                    return {
                      name: 'Unconnected Send Error',
                      description: 'Invalid Node Address specified in the route path field.',
                      type: 'routing',
                    };
                  case 0x0315:
                    return {
                      name: 'Unconnected Send Error',
                      description: 'Invalid segment type in the route path field.',
                      type: 'routing',
                    };
                  default:
                    break;
                }
              }
              break;
            case 2:
              return {
                name: 'Unconnected Send Error',
                description: 'Resource error. The CIP Router lacks the resources to fully process the Unconnected Send Request.',
                type: 'resource',
              };
            case 4:
              return {
                name: 'Unconnected Send Error',
                description: 'Segment type error. The CIP Router experienced a parsing error when extracting the Explicit Messaging Request from the Unconnected Send Request Service Data.',
                type: 'parsing',
              };
            default:
              break;
          }
          return {
            name: 'Unknown',
            description: 'Unknown',
            type: 'unknown',
          };
        },
        errorDataHandler,
      },
    );
  }

  static ForwardOpen(connection: Connection, incrementCounters: boolean) {
    if (incrementCounters) {
      incrementConnectionCounters();
      connection.options.connectionSerialNumber = ConnectionSerialNumberCounter;
    }

    let offset = 0;
    const data = Buffer.alloc(36 + connection.options.route!.length + (connection.large ? 4 : 0));

    offset = encodeConnectionTiming(
      data,
      offset,
      connection.options.tickTime!,
      connection.options.timeoutTicks!,
    );

    offset = data.writeUInt32LE(OtoTNetworkConnectionIDCounter, offset);
    offset = data.writeUInt32LE(TtoONetworkConnectionIDCounter, offset);
    offset = data.writeUInt16LE(ConnectionSerialNumberCounter, offset);
    offset = data.writeUInt16LE(connection.options.vendorID!, offset);
    offset = data.writeUInt32LE(connection.options.originatorSerialNumber!, offset);
    offset = data.writeUInt8(connection.options.connectionTimeoutMultiplier!, offset);

    offset = data.writeUInt8(0, offset); /** Reserved */
    offset = data.writeUInt8(0, offset); /** Reserved */
    offset = data.writeUInt8(0, offset); /** Reserved */

    offset = data.writeUInt32LE(connection.options.OtoTRPI!, offset);
    if (connection.large) {
      offset = data.writeUInt32LE(connection.OtoTNetworkConnectionParametersCode, offset);
    } else {
      offset = data.writeUInt16LE(connection.OtoTNetworkConnectionParametersCode, offset);
    }

    // Target to Originator requested packet interval (rate), in microseconds
    offset = data.writeUInt32LE(connection.options.TtoORPI!, offset);

    if (connection.large) {
      offset = data.writeUInt32LE(connection.TtoONetworkConnectionParametersCode, offset);
    } else {
      offset = data.writeUInt16LE(connection.TtoONetworkConnectionParametersCode, offset);
    }

    /**
     * Transport type/trigger
     * 0xA3: Direction = Server, Production Trigger = Application Object, Trasport Class = 3
     * */
    offset = data.writeUInt8(connection.transportClassTriggerCode, offset);
    offset = data.writeUInt8(connection.options.route!.length / 2, offset); // Connection path size
    offset += connection.options.route!.copy(data, offset);

    if (offset !== data.length) {
      throw new Error('offset does not match data length');
    }

    return ConnectionManagerCIPRequest(
      connection.large ? ServiceCodes.LargeForwardOpen : ServiceCodes.ForwardOpen,
      data,
      (buffer: Buffer, offsetRef: Ref) => {
        const OtoTNetworkConnectionID = buffer.readUInt32LE(offsetRef.current); offsetRef.current += 4;
        const TtoONetworkConnectionID = buffer.readUInt32LE(offsetRef.current); offsetRef.current += 4;
        const ConnectionSerialNumber = buffer.readUInt16LE(offsetRef.current); offsetRef.current += 2;
        const OriginatorVendorID = buffer.readUInt16LE(offsetRef.current); offsetRef.current += 2;
        const OriginatorSerialNumber = buffer.readUInt32LE(offsetRef.current); offsetRef.current += 4;
        const OtoTActualPacketRate = buffer.readUInt32LE(offsetRef.current); offsetRef.current += 4;
        const TtoOActualPacketRate = buffer.readUInt32LE(offsetRef.current); offsetRef.current += 4;
        const appReplySize = 2 * buffer.readUInt8(offsetRef.current); offsetRef.current += 1;
        offsetRef.current += 1; // reserved

        const data = buffer.slice(offsetRef.current, offsetRef.current + appReplySize);
        offsetRef.current += appReplySize;

        return {
          OtoTNetworkConnectionID,
          TtoONetworkConnectionID,
          ConnectionSerialNumber,
          OriginatorVendorID,
          OriginatorSerialNumber,
          OtoTActualPacketRate,
          TtoOActualPacketRate,
          data,
        };
      },
    );
  }

  /** CIP Vol 1 3-5.5.3 */
  static ForwardClose(connection: Connection) {
    let offset = 0;
    const data = Buffer.allocUnsafe(12 + connection.options.route!.length);

    offset = encodeConnectionTiming(
      data,
      offset,
      connection.options.tickTime!,
      connection.options.timeoutTicks!,
    );

    offset = data.writeUInt16LE(connection.options.connectionSerialNumber!, offset);
    offset = data.writeUInt16LE(connection.options.vendorID!, offset);
    offset = data.writeUInt32LE(connection.options.originatorSerialNumber!, offset);

    // connection path size, 16-bit words
    offset = data.writeUInt8(connection.options.route!.length / 2, offset);
    offset = data.writeUInt8(0, offset); /** Reserved */
    offset += connection.options.route!.copy(data, offset);

    if (offset !== data.length) {
      throw new Error('offset does not match data length');
    }

    return ConnectionManagerCIPRequest(
      ServiceCodes.ForwardClose,
      data,
      (buffer: Buffer, offsetRef) => {
        const SerialNumber = buffer.readUInt16LE(offsetRef.current); offsetRef.current += 2;
        const VendorID = buffer.readUInt16LE(offsetRef.current); offsetRef.current += 2;
        const OriginatorSerialNumber = buffer.readUInt32LE(offsetRef.current); offsetRef.current += 4;
        const appReplySize = 2 * buffer.readUInt8(offsetRef.current); offsetRef.current += 1;
        offsetRef.current += 1; /** Reserved */
        const data = buffer.slice(offsetRef.current, offsetRef.current + appReplySize);
        offsetRef.current += appReplySize;
        return {
          SerialNumber,
          VendorID,
          OriginatorSerialNumber,
          data,
        };
      },
    );
  }

  /**
   * CIP Vol 1 3-5.5.5
   *
   * This service shall return the parameters associated with a specified connection_number.
   * The connection_number may be different from device to device even for the same connection.
   * The connection_number corresponds to the offset into the Connection Manager attribute
   * that enumerates the status of the connections.
   * */
  static GetConnectionData(connectionNumber: number) {
    const data = Buffer.allocUnsafe(2);

    data.writeUInt16LE(connectionNumber, 0);

    return ConnectionManagerCIPRequest(
      ServiceCodes.GetConnectionData,
      data,
      connectionDataResponse,
    );
  }

  /**
   * CIP Vol1 3-5.5.6
   *
   * This service shall return the parameters associated with the specified
   * connection serial number, originator vendor ID and originator serial number.
   *
   * The format of the Search_Connection_Data response shall be the same as
   * the response from the Get_Connection_Data service.
   * */
  static SearchConnectionData(connectionSerialNumber: number, originatorVendorID: number, originatorSerialNumber: number) {
    let offset = 0;
    const data = Buffer.allocUnsafe(8);

    offset = data.writeUInt16LE(connectionSerialNumber, offset);
    offset = data.writeUInt16LE(originatorVendorID, offset);
    data.writeUInt32LE(originatorSerialNumber, offset);

    return ConnectionManagerCIPRequest(
      ServiceCodes.SearchConnectionData,
      data,
      connectionDataResponse,
    );
  }

  static TranslateResponse(response: CIPResponse) {
    if (ServiceCodeSet.has(response.service.code)) {
      response.service.name = ServiceCodes[response.service.code] || response.service.name;
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
}
