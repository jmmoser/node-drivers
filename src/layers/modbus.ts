import { CallbackPromise, Callback, once } from '../utils';
import Layer from './layer';
import { LayerNames } from './constants';
import * as MB from '../core/modbus/constants';
import Frames from '../core/modbus/frames/index';
import PDU, { ModbusValues } from '../core/modbus/pdu';

import CreateCounter, { Counter } from '../counter';

const {
  ReadDiscreteInputs,
  ReadCoils,
  ReadInputRegisters,
  ReadHoldingRegisters,
  WriteSingleCoil,
  WriteMultipleCoils,
  WriteSingleHoldingRegister,
  // WriteMultipleHoldingRegisters
} = MB.Functions;

const DefaultOptions = {
  tcp: {
    port: 502,
  },
};

function readRequest<T>(self: Modbus, fn: number, address: number, count: number, littleEndian: boolean, callback?: Callback<T>) {
  return CallbackPromise(callback, (resolver) => {
    self._send!(PDU.EncodeReadRequest(fn, address, count, littleEndian), {}, resolver);
  });
}

function writeRequest<T>(self: Modbus, fn: number, address: number, values: ModbusValues, littleEndian: boolean, callback?: (err?: Error, value?: T) => void) {
  return CallbackPromise(callback, (resolver) => {
    self._send!(PDU.EncodeWriteRequest(fn, address, values, littleEndian), {}, resolver);
  });
}

interface ModbusTCPOptions {
  unitID?: number;
  protocolID?: number;
}

export type ModbusOptions = ModbusTCPOptions;

export default class Modbus extends Layer {
  _littleEndian: boolean;
  _transactionCounter?: Counter;
  _send?: Function;
  _frameClass: any;

  constructor(lowerLayer: Layer, options?: ModbusOptions) {
    super(LayerNames.Modbus, lowerLayer, undefined, DefaultOptions);

    this._littleEndian = false;

    switch (lowerLayer.name) {
      case LayerNames.TCP: {
        const cOpts = {
          unitID: 0xFF,
          protocolID: 0,
          ...options,
        };

        const transactionCounter = CreateCounter({ maxValue: 0x10000 });
        this._frameClass = Frames.TCP;
        this._send = (pdu: Buffer, opts: { protocolID?: number; unitID?: number }, resolver: { resolve: Function, reject: Function }) => {
          opts = opts || {};
          const transaction = transactionCounter!();

          const callback = this.contextCallback(
            once((err?: Error) => {
              if (err) {
                /** e.g. handle timeout error and return null */
                resolver.reject(err);
                return null;
              }
              return resolver;
            }),
            transaction.toString(),
          );

          const message = Frames.TCP.Encode(
            transaction,
            opts.protocolID || cOpts.protocolID,
            opts.unitID || cOpts.unitID,
            pdu,
          );

          this.send(message, null, false, callback);
        };
        this.setDefragger(Frames.TCP.Length);
        break;
      }
      case LayerNames.CIP:
        this._littleEndian = true;
        break;
      default:
        break;
    }
  }

  readDiscreteInputs(address: number, count: number, callback?: Callback<number[]>) {
    return readRequest(this, ReadDiscreteInputs, address, count, this._littleEndian, callback);
  }

  readCoils(address: number, count: number, callback?: Callback<boolean[]>) {
    return readRequest(this, ReadCoils, address, count, this._littleEndian, callback);
  }

  readInputRegisters(address: number, count: number, callback?: Callback<number[]>) {
    return readRequest(this, ReadInputRegisters, address, count, this._littleEndian, callback);
  }

  readHoldingRegisters(address: number, count = 1, callback?: Callback<number[]>) {
    return readRequest(this, ReadHoldingRegisters, address, count, this._littleEndian, callback);
  }

  writeSingleCoil(address: number, value: boolean, callback?: Callback<any>) {
    const values = [value ? 0x00FF : 0x0000];
    return writeRequest(this, WriteSingleCoil, address, values, this._littleEndian, callback);
  }

  writeMultipleCoils(address: number, values: ModbusValues, callback?: Callback<any>) {
    for (let i = 0; i < values.length; i++) {
      values[i] = values[i] ? 0x00FF : 0x0000;
    }
    return writeRequest(this, WriteMultipleCoils, address, values, this._littleEndian, callback);
  }

  writeSingleHoldingRegister(address: number, values: ModbusValues, callback?: Callback<any>) {
    return writeRequest(
      this,
      WriteSingleHoldingRegister,
      address,
      values,
      this._littleEndian,
      callback,
    );
  }

  // writeMultipleHoldingRegisters(address, values, callback) {
  //   return CallbackPromise(callback, (resolver) => {
  //     resolver.reject('Not supported yet');
  //   });
  // }

  handleData(data: Buffer) {
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
