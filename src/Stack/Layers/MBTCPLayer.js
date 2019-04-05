'use strict';

const Layer = require('./Layer');
const MBPacket = require('../Packets/MBPacket');

const { Functions } = MBPacket;

class MBTCPLayer extends Layer {
  constructor(layer) {
    super(layer);
    this._transactionCounter = 0;
    this._callbacks = new Map();

    this.setDefragger(MBPacket.IsComplete, MBPacket.Length);
  }

  readDiscreteInputs(unitID, address, count, callback) {
    return Layer.CallbackPromise(callback, resolver => {
      const fn = Functions.ReadDiscreteInputs;
      const data = __readRequest(fn, address, count);
      __send(this, unitID, data, resolver);
    });
  }

  readCoils(unitID, address, count, callback) {
    return Layer.CallbackPromise(callback, resolver => {
      const fn = Functions.ReadCoils;
      const data = __readRequest(fn, address, count);
      __send(this, unitID, data, resolver);
    });
  }

  readInputRegisters(unitID, address, count, callback) {
    return Layer.CallbackPromise(callback, resolver => {
      const fn = Functions.ReadInputRegisters;
      const data = __readRequest(fn, address, count);
      __send(this, unitID, data, resolver);
    });
  }

  readHoldingRegisters(unitID, address, count, callback) {
    return Layer.CallbackPromise(callback, resolver => {
      const fn = Functions.ReadHoldingRegisters;
      const data = __readRequest(fn, address, count);
      __send(this, unitID, data, resolver);
    });
  }

  writeSingleCoil(unitID, address, value, callback) {
    return Layer.CallbackPromise(callback, resolver => {
      const fn = Functions.WriteSingleCoil;
      const data = __writeRequest(fn, address, [value ? 0x00FF : 0x0000]);
      __send(this, unitID, data, resolver);
    });
  }

  writeMultipleCoils(unitID, address, values, callback) {
    return Layer.CallbackPromise(callback, resolver => {
      for (let i = 0; i < values.length; i++) {
        values[i] = values[i] ? 0x00FF : 0x0000;
      }

      const fn = Functions.WriteMultipleCoils;
      const data = __writeRequest(fn, address, values);
      __send(this, unitID, data, resolver);
    });
  }

  writeSingleRegister(unitID, address, value, callback) {
    return Layer.CallbackPromise(callback, resolver => {
      const fn = Functions.WriteSingleRegister;
      const data = __writeRequest(fn, address, [value]);
      __send(this, unitID, data, resolver);
    });
  }

  writeMultipleRegisters(unitID, address, values, callback) {
    return Layer.CallbackPromise(callback, resolver => {
      const fn = Functions.WriteMultipleRegisters;
      resolver.reject('Not supported yet');
    });
  }


  handleData(data) {
    const packet = MBPacket.FromBuffer(data);

    if (this._callbacks.has(packet.transactionID)) {
      const resolver = this._callbacks.get(packet.transactionID);
      this._callbacks.delete(packet.transactionID);

      const reply = packet.reply;
      if (reply.error) {
        resolver.reject(reply.error.message, reply);
      } else {
        resolver.resolve(reply.data);
      }
    } else {
      console.log('Unhandled ModbusTCP packet:');
      console.log(packet);
    }
  }

  // handleData(data) {
  //   const packet = MBPacket.FromBuffer(data);

  //   if (this._callbacks.has(packet.transactionID)) {
  //     const callback = this._callbacks.get(packet.transactionID);
  //     this._callbacks.delete(packet.transactionID);
  //     callback(packet.reply);
  //   } else {
  //     console.log('Unhandled ModbusTCP packet:');
  //     console.log(packet);
  //   }
  // }
}

module.exports = MBTCPLayer;


function __incrementTransactionCounter(layer) {
  layer._transactionCounter = (layer._transactionCounter + 1) % 0x10000;
  return layer._transactionCounter;
}


function __readRequest(functionCode, startingAddress, count) {
  const buffer = Buffer.allocUnsafe(5);
  buffer.writeUInt8(functionCode, 0);
  buffer.writeUInt16BE(startingAddress, 1);
  buffer.writeUInt16BE(count, 3);
  return buffer;
}

function __writeRequest(functionCode, startingAddress, values) {
  const buffer = Buffer.alloc(3 + 2 * values.length);
  buffer.writeUInt8(functionCode, 0);
  buffer.writeUInt16BE(startingAddress, 1);
  for (let i = 0; i < values.length; i++) {
    values[i].copy(buffer, 2 * i + 3, 0, 2);
  }
  return buffer;
}


function __send(layer, unitID, data, callback) {
  const transactionID = __incrementTransactionCounter(layer);
  if (callback != null) layer._callbacks.set(transactionID, callback);

  const packet = new MBPacket();
  packet.transactionID = transactionID;
  packet.unitID = unitID;
  packet.data = data;

  layer.send(packet.toBuffer(), null, false);
}