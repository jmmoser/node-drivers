import { CallbackPromise, once } from '../../utils.js';
import Layer from '../Layer.js';
import * as MB from '../../core/modbus/constants.js';
import Frames from '../../core/modbus/frames/index.js';
import PDU from '../../core/modbus/pdu.js';

const {
  ReadDiscreteInputs,
  ReadCoils,
  ReadInputRegisters,
  ReadHoldingRegisters,
  WriteSingleCoil,
  WriteSingleHoldingRegister,
  // WriteMultipleHoldingRegisters
} = MB.Functions;

const DefaultOptions = {
  tcp: {
    port: 502,
  },
};

/** Coil/discrete-input responses pack one status per bit, LSB first */
function unpackBits(bytes, count) {
  const values = [];
  for (let i = 0; i < count; i++) {
    values.push(((bytes[i >> 3] >> (i & 0b111)) & 1) === 1);
  }
  return values;
}

function readRequest(self, fn, address, count, callback) {
  if (typeof count === 'function' && callback == null) {
    callback = count; // eslint-disable-line no-param-reassign
    count = undefined; // eslint-disable-line no-param-reassign
  }
  if (count == null) {
    count = 1; // eslint-disable-line no-param-reassign
  }
  const unpacksBits = fn === ReadCoils || fn === ReadDiscreteInputs;
  return CallbackPromise(callback, (resolver) => {
    const sendResolver = unpacksBits ? {
      resolve: (bytes) => resolver.resolve(unpackBits(bytes, count)),
      reject: resolver.reject,
    } : resolver;
    self._send(PDU.EncodeReadRequest(fn, address, count), {}, sendResolver);
  });
}

function writeRequest(self, fn, address, values, callback) {
  return CallbackPromise(callback, (resolver) => {
    self._send(PDU.EncodeWriteRequest(fn, address, values), {}, resolver);
  });
}

export default class Modbus extends Layer {
  constructor(lowerLayer, options) {
    super('modbus', lowerLayer, null, DefaultOptions);

    switch (lowerLayer.name) {
      case 'tcp': {
        const cOpts = {
          unitID: 0xFF,
          protocolID: 0,
          timeout: 10000,
          ...options,
        };

        this._transactionCounter = 0;
        this._frameClass = Frames.TCP;
        this._send = (pdu, opts, resolver) => {
          opts = opts || {};
          this._transactionCounter = (this._transactionCounter + 1) % 0x10000;

          const callback = this.contextCallback(
            once((err) => {
              if (err) {
                /** e.g. handle timeout error and return null */
                resolver.reject(err);
                return null;
              }
              return resolver;
            }),
            this._transactionCounter,
            cOpts.timeout,
          );

          /** ?? not || — unitID 0 (broadcast) and protocolID 0 are valid overrides */
          const message = Frames.TCP.Encode(
            this._transactionCounter,
            opts.protocolID ?? cOpts.protocolID,
            opts.unitID ?? cOpts.unitID,
            pdu,
          );

          this.send(message, null, false, callback);
        };
        this.setDefragger(Frames.TCP.IsComplete, Frames.TCP.Length);
        break;
      }
      default:
        break;
    }
  }

  readDiscreteInputs(inputAddressing, count, callback) {
    return readRequest(this, ReadDiscreteInputs, inputAddressing, count, callback);
  }

  readCoils(inputAddressing, count, callback) {
    return readRequest(this, ReadCoils, inputAddressing, count, callback);
  }

  readInputRegisters(inputAddressing, count, callback) {
    return readRequest(this, ReadInputRegisters, inputAddressing, count, callback);
  }

  readHoldingRegisters(inputAddressing, count, callback) {
    return readRequest(this, ReadHoldingRegisters, inputAddressing, count, callback);
  }

  writeSingleCoil(inputAddressing, value, callback) {
    /** 0xFF00 is the only valid ON value for function 0x05 */
    const values = [value ? 0xFF00 : 0x0000];
    return writeRequest(this, WriteSingleCoil, inputAddressing, values, callback);
  }

  writeMultipleCoils(inputAddressing, values, callback) {
    return CallbackPromise(callback, (resolver) => {
      this._send(PDU.EncodeWriteMultipleCoilsRequest(inputAddressing, values), {}, resolver);
    });
  }

  writeSingleHoldingRegister(inputAddressing, values, callback) {
    return writeRequest(this, WriteSingleHoldingRegister, inputAddressing, values, callback);
  }

  // writeMultipleHoldingRegisters(inputAddressing, values, callback) {
  //   return CallbackPromise(callback, (resolver) => {
  //     resolver.reject('Not supported yet');
  //   });
  // }

  handleData(data) {
    const packet = this._frameClass.Decode(data, { current: 0 });

    const callback = this.callbackForContext(packet.transactionID);
    if (callback) {
      /**
       * We were expecting this message but it may have already timed out.
       * If it has timed out, callback will return null
       * */
      const resolver = callback();

      if (resolver) {
        if (packet.pdu.error) {
          resolver.reject(packet.pdu.error.message, packet.pdu);
        } else {
          resolver.resolve(packet.pdu.value);
        }
      } else {
        console.log('Timed out message received', packet);
      }
    } else {
      console.log('Unhandled Modbus packet:', packet);
    }
  }
}
