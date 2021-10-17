'use strict';

const { CallbackPromise, once } = require('../../utils');
const Layer = require('../Layer');
const MB = require('./MB');
const MBFrame = require('./MBFrame');
const PDU = require('./PDU');

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

// /** this needs to be improved */
// const HoldingRegisterAddressRegex = /^0?4\d{4,5}/;

const DefaultOptions = {
  tcp: {
    port: 502,
  },
};

/**
 * holding register numbers start with 4 and span from 40001 to 49999.
 */
// TODO
function parseAddressingInput(fn, input) {
  return {
    address: parseInt(input, 10),
  };
}

function readRequest(self, fn, input, count, callback) {
  return CallbackPromise(callback, (resolver) => {
    const addressing = parseAddressingInput(fn, input);
    const data = self._frameClass.ReadRequest(addressing.input, count);
    self._send(fn, data, {}, resolver);
  });
}

function writeRequest(self, fn, address, values, callback) {
  return CallbackPromise(callback, (resolver) => {
    const data = self._frameClass.WriteRequest(address, values);
    self._send(fn, data, {}, resolver);
  });
}

class MBLayer extends Layer {
  constructor(lowerLayer, options) {
    super('modbus', lowerLayer, null, DefaultOptions);

    switch (lowerLayer.name) {
      case 'tcp': {
        const cOpts = {
          unitID: 255,
          protocolID: 0,
          ...options,
        };

        this._transactionCounter = 0;
        this._frameClass = MBFrame.TCP;
        this._send = (fn, data, opts, resolver) => {
          opts = opts || {};
          this._transactionCounter = (this._transactionCounter + 1) % 0x10000;
          const unitID = opts.unitID || cOpts.unitID;
          const protocolID = opts.protocolID || cOpts.protocolID;
          const frame = new MBFrame.TCP(
            new PDU(fn, data),
            this._transactionCounter,
            unitID,
            protocolID,
          );

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
          );

          this.send(frame.toBuffer(), null, false, callback);
        };
        this.setDefragger(MBFrame.TCP.IsComplete, MBFrame.TCP.Length);
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
    const values = [value ? 0x00FF : 0x0000];
    return writeRequest(this, WriteSingleCoil, inputAddressing, values, callback);
  }

  writeMultipleCoils(inputAddressing, values, callback) {
    for (let i = 0; i < values.length; i++) {
      values[i] = values[i] ? 0x00FF : 0x0000;
    }
    return writeRequest(this, WriteMultipleCoils, inputAddressing, values, callback);
  }

  writeSingleHoldingRegister(inputAddressing, values, callback) {
    return writeRequest(this, WriteSingleHoldingRegister, inputAddressing, values, callback);
  }

  writeMultipleHoldingRegisters(inputAddressing, values, callback) {
    return CallbackPromise(callback, (resolver) => {
      resolver.reject('Not supported yet');
    });
  }

  handleData(data) {
    const packet = this._frameClass.FromBuffer(data);

    const callback = this.callbackForContext(packet.transactionID);
    if (callback) {
      /**
       * We were expecting this message but it may have already timed out.
       * If it has timed out, callback will return null
       * */
      const resolver = callback();

      if (resolver) {
        const { reply } = packet;
        if (reply.error) {
          resolver.reject(reply.error.message, reply);
        } else {
          resolver.resolve(reply.data);
        }
      } else {
        console.log(`Timed out message received`);
        console.log(packet);
      }
    } else {
      console.log('Unhandled Modbus packet:');
      console.log(packet);
      console.log(arguments);
    }

    // const resolver = callback ? callback() : null;

    // if (resolver) {
    //   const reply = packet.reply;
    //   if (reply.error) {
    //     resolver.reject(reply.error.message, reply);
    //   } else {
    //     resolver.resolve(reply.data);
    //   }
    // } else {
    //   console.log('Unhandled ModbusTCP packet:');
    //   console.log(packet);
    //   console.log(arguments);
    // }
  }
}

module.exports = MBLayer;

function send(self, fn, data, resolver, timeout) {
  const frame = self._createFrame(fn, data, null);

  const callback = self.contextCallback(
    once((err) => {
      if (err) {
        /** e.g. handle timeout error and return null */
        resolver.reject(err);
        return null;
      }
      return resolver;
    }),
    transactionID,
    timeout,
  );

  self.send(frame.toBuffer(), null, false, callback);
}
