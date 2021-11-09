import { CallbackPromise } from '../utils';
import Layer from './layer';
import { LayerNames } from './constants';
import PCCCPacket from '../core/pccc/packet';
import * as Encoding from '../core/pccc/encoding';
import * as Decoding from '../core/pccc/decoding';

import { CodedValue } from '../types';

function incrementTransaction(self: PCCCLayer) {
  self._transaction++;
  return self._transaction % 0x10000;
}

type Status = CodedValue & {
  extended: CodedValue;
}

function getError(status: Status) {
  if (status.code === 0) return null;

  if (status.extended.description != null && status.extended.description.length > 0) {
    return status.extended.description;
  }

  return status.description;
}

function send(self: PCCCLayer, internal: boolean, message: Buffer, contextOrCallback: number | Function) {
  let context;
  if (internal) {
    if (typeof contextOrCallback === 'function') {
      context = self.contextCallback(contextOrCallback);
    }
  } else {
    context = contextOrCallback;
  }

  const transaction = PCCCPacket.Transaction(message, { current: 0 });

  self.setContextForID(transaction + '', {
    context,
    internal,
    message,
  });

  self.send(message, null, false);
}

/**
 * Uses transactions to map responses to requests
 */

export default class PCCCLayer extends Layer {
  _transaction: number;

  constructor(lowerLayer: Layer) {
    super(LayerNames.PCCC, lowerLayer);
    this._transaction = 0;
  }

  wordRangeRead(address: string, words?: number, callback?: Function) {
    if (callback == null && typeof words === 'function') {
      callback = words;
      words = undefined;
    }

    if (words == null) {
      words = 1;
    }

    return CallbackPromise(callback, (resolver) => {
      const message = Encoding.EncodeWordRangeReadRequest(
        incrementTransaction(this),
        address,
        words!,
      );

      send(this, true, message, (error?: Error, reply?: { data: Buffer }) => {
        if (error) {
          resolver.reject(error, reply);
        } else {
          resolver.resolve(reply!.data);
        }
      });
    });
  }

  typedRead(address: string, items?: number, callback?: Function) {
    if (callback == null && typeof items === 'function') {
      callback = items;
      items = undefined;
    }

    return CallbackPromise(callback, (resolver) => {
      const itemsSpecified = items != null;

      if (itemsSpecified) {
        if ((!Number.isFinite(items) || items! <= 0 || items! > 0xFFFF)) {
          resolver.reject('If specified, items must be a positive integer between 1 and 65535');
          return;
        }
      } else {
        items = 1;
      }

      const message = Encoding.EncodeTypedRead(
        incrementTransaction(this),
        address,
        items!,
      );

      send(this, true, message, (error?: Error, reply?: { data: Buffer }) => {
        if (error) {
          resolver.reject(error, reply);
        } else {
          const value = Decoding.DecodeTypedReadResponse(reply!.data, { current: 0 });
          if (items === 1 && Array.isArray(value) && value.length > 0) {
            resolver.resolve(value[0]);
          } else {
            resolver.resolve(value);
          }
        }
      });
    });
  }

  /**
   * value argument can be an array of values
   */
  typedWrite(address: string, value: any | any[], callback?: Function) {
    return CallbackPromise(callback, (resolver) => {
      if (value == null) {
        resolver.reject(`Unable to write value: ${value}`);
        return;
      }

      value = Array.isArray(value) ? value : [value];

      const message = Encoding.EncodeTypedWrite(
        incrementTransaction(this),
        address,
        value,
      );

      send(this, true, message, (error?: Error, reply?: any) => {
        if (error) {
          resolver.reject(error, reply);
        } else {
          resolver.resolve(reply);
        }
      });
    });
  }

  // unprotectedRead(address, size, callback) {
  //   if (callback == null) return;

  //   if (size === 0 || size % 2 !== 0) {
  //     callback('size must be an even number');
  //     return;
  //   }

  //   const transaction = incrementTransaction(this);
  //   const message = Encoding.EncodeUnprotectedRead(transaction, address, size);

  //   this.send(message, INFO, false, this.contextCallback(function(error, reply) {
  //     if (error) {
  //       callback(error);
  //     } else {
  //       callback(null, reply);
  //     }
  //   }, transaction));
  // }

  diagnosticStatus(callback?: Function) {
    return CallbackPromise(callback, (resolver) => {
      const message = Encoding.EncodeDiagnosticStatus(
        incrementTransaction(this),
      );

      send(this, true, message, (error?: Error, reply?: { data: any }) => {
        if (error) {
          resolver.reject(error, reply);
        } else {
          resolver.resolve(reply?.data);
        }
      });
    });
  }

  echo(data: Buffer, callback?: Function) {
    return CallbackPromise(callback, (resolver) => {
      const message = Encoding.EncodeEcho(
        incrementTransaction(this),
        data,
      );

      send(this, true, message, (error?: Error, reply?: { data: any }) => {
        if (error) {
          resolver.reject(error, reply);
        } else {
          resolver.resolve(reply?.data);
        }
      });
    });
  }

  /** For sending CIP requests over PCCC */
  sendNextMessage() {
    const request = this.getNextRequest();
    if (request != null) {
      // requests can either be
      // - unconnected (0x0B)
      // - connected (0x0A)

      // Fragmentation protocol is currently not supported

      let packet;
      const transaction = incrementTransaction(this);

      const { info, message } = request;

      if (info != null && info.connectionID != null && info.transportHeader != null) {
        packet = Encoding.EncodeConnectedRequest(
          transaction,
          info.connectionID,
          info.transportHeader,
          message,
        );
      } else {
        packet = Encoding.EncodeUnconnectedRequest(
          transaction,
          message,
        );
      }

      send(this, false, packet, request.context);
    }
  }

  handleData(data: Buffer, info: any, context: any) {
    const packet = PCCCPacket.fromBufferReply(data, { current: 0 });

    const savedContext = this.getContextForID(packet.transaction + '', false);
    if (!savedContext) {
      console.log('PCCC Layer unhandled data', data, info, context);
      return;
    }

    if (savedContext.internal) {
      const callback = this.callbackForContext(savedContext.context);
      if (callback != null) {
        callback(getError(packet.status), packet, info);
        return;
      }
    }

    this.forward(packet.data!, info, savedContext.context);
  }
}

/*
  PLC-2 Communication Commands
    -Uprotected Read
    -Protected Write
    -Uprotected Write
    -Protected Bit Write
    -Unprotected Bit Write

  PLC-5 Communication Commands
    -Read MOdify Write
    -Read Modify Write N
    -Typed Read
    -Typed Write
    -Word Range Read
    -Word Range Write
    -Bit Write

  SLC Communication Commands
    -SLC Protected Typed Logical Read with 3 Address Fields
    -SLC Protected Typed Logical Write with 3 Address Fields
    -SLC Protected Typed Logical Read with 2 Address Fields
    -SLC Protected Typed Logical Write with 2 Address Fields
*/

// /** Ref. CIP and PCCC v1, Appendix B, pg. 17 */
// const FragmentationFunctions = Object.freeze({
//   Only: 0x00,
//   FirstRequest: 0x01,
//   Middle: 0x02,
//   Last: 0x03,
//   FirstResponse: 0x04,
//   SendMore: 0x05,
//   Abort: 0x06,
//   AckResponse: 0x07,
//   NakResponse: 0x08
// });

// class Fragger {
//   constructor(data, info) {
//     this.data = data;
//     this.info = info || {};
//     this.connected = this.info.connectionID && this.info.transportHeader;
//   }
// }
