'use strict';

const Layer = require('./Layer');
const MBPacket = require('../Packets/MBPacket');

class MBTCPLayer extends Layer {
  constructor(layer) {
    super(layer);
    this._transactionCounter = 0;
    this._callbacks = new Map();

    this.setDefragger(MBPacket.IsComplete, MBPacket.Length);
  }

  readDiscreteInputs(unitID, address, count, callback) {
    return Layer.CallbackPromise(callback, resolver => {
      const fn = MBPacket.Functions.ReadDiscreteInputs;
      const data = this._readRequest(fn, address, count);
      this._send(unitID, data, resolver);
    });
  }

  readCoils(unitID, address, count, callback) {
    return Layer.CallbackPromise(callback, resolver => {
      const fn = MBPacket.Functions.ReadCoils;
      const data = this._readRequest(fn, address, count);
      this._send(unitID, data, resolver);
    });
  }

  readInputRegisters(unitID, address, count, callback) {
    return Layer.CallbackPromise(callback, resolver => {
      const fn = MBPacket.Functions.ReadInputRegisters;
      const data = this._readRequest(fn, address, count);
      this._send(unitID, data, resolver);
    });
  }

  readHoldingRegisters(unitID, address, count, callback) {
    return Layer.CallbackPromise(callback, resolver => {
      const fn = MBPacket.Functions.ReadHoldingRegisters;
      const data = this._readRequest(fn, address, count);
      this._send(unitID, data, resolver);
    });
  }

  writeSingleCoil(unitID, address, value, callback) {
    return Layer.CallbackPromise(callback, resolver => {
      const fn = MBPacket.Functions.WriteSingleCoil;
      const data = this._writeRequest(fn, address, [value ? 0x00FF : 0x0000]);
      this._send(unitID, data, resolver);
    });
  }

  writeMultipleCoils(unitID, address, values, callback) {
    return Layer.CallbackPromise(callback, resolver => {
      for (let i = 0; i < values.length; i++) {
        values[i] = values[i] ? 0x00FF : 0x0000;
      }

      const fn = MBPacket.Functions.WriteMultipleCoils;
      const data = this._writeRequest(fn, address, values);
      this._send(unitID, data, resolver);
    });
  }

  writeSingleRegister(unitID, address, value, callback) {
    return Layer.CallbackPromise(callback, resolver => {
      const fn = MBPacket.Functions.WriteSingleRegister;
      const data = this._writeRequest(fn, address, [value]);
      this._send(unitID, data, resolver);
    });
  }

  writeMultipleRegisters(unitID, address, values, callback) {
    return Layer.CallbackPromise(callback, resolver => {
      const fn = MBPacket.Functions.WriteMultipleRegisters;
      resolver.reject('Not supported yet');
    });
  }

  // readDiscreteInputs(unitID, address, count, callback) {
  //   const fn = MBPacket.Functions.ReadDiscreteInputs;
  //   const data = this._readRequest(fn, address, count);
  //   this._send(unitID, data, callback);
  // }

  // readCoils(unitID, address, count, callback) {
  //   const fn = MBPacket.Functions.ReadCoils;
  //   const data = this._readRequest(fn, address, count);
  //   this._send(unitID, data, callback);
  // }

  // readInputRegisters(unitID, address, count, callback) {
  //   const fn = MBPacket.Functions.ReadInputRegisters;
  //   const data = this._readRequest(fn, address, count);
  //   this._send(unitID, data, callback);
  // }

  // readHoldingRegisters(unitID, address, count, callback) {
  //   const fn = MBPacket.Functions.ReadHoldingRegisters;
  //   const data = this._readRequest(fn, address, count);
  //   this._send(unitID, data, callback);
  // }

  // writeSingleCoil(unitID, address, value, callback) {
  //   const fn = MBPacket.Functions.WriteSingleCoil;
  //   const data = this._writeRequest(fn, address, [value ? 0x00FF : 0x0000]);
  //   this._send(unitID, data, callback);
  // }

  // writeMultipleCoils(unitID, address, values, callback) {
  //   for (let i = 0; i < values.length; i++) {
  //     values[i] = values[i] ? 0x00FF: 0x0000;
  //   }
  //   const fn = MBPacket.Functions.WriteMultipleCoils;
  //   const data = this._writeRequest(fn, address, values);
  //   this._send(unitID, data, callback);
  // }

  // writeSingleRegister(unitID, address, value, callback) {
  //   const fn = MBPacket.Functions.WriteSingleRegister;
  //   const data = this._writeRequest(fn, address, [value]);
  //   this._send(unitID, data, callback);
  // }

  // writeMultipleRegisters(unitID, address, values, callback) {
  //   const fn = MBPacket.Functions.WriteMultipleRegisters;

  //   if (callback) callback({ message: 'Not supported yet' });
  // }

  _readRequest(functionCode, startingAddress, count) {
    const buffer = Buffer.allocUnsafe(5);
    buffer.writeUInt8(functionCode, 0);
    buffer.writeUInt16BE(startingAddress, 1);
    buffer.writeUInt16BE(count, 3);
    return buffer;
  }

  _writeRequest(functionCode, startingAddress, values) {
    const buffer = Buffer.alloc(3 + 2 * values.length);
    buffer.writeUInt8(functionCode, 0);
    buffer.writeUInt16BE(startingAddress, 1);
    for (let i = 0; i < values.length; i++) {
      values[i].copy(buffer, 2 * i + 3, 0, 2);
    }
    return buffer;
  }




  _incrementTransactionCounter() {
    this._transactionCounter = (this._transactionCounter + 1) % 0x10000;
    return this._transactionCounter;
  }

  _send(unitID, data, resolver) {
    const transactionID = this._incrementTransactionCounter();
    if (resolver != null) this._callbacks.set(transactionID, resolver);

    const packet = new MBPacket();
    packet.transactionID = transactionID;
    packet.unitID = unitID;
    packet.data = data;

    this.send(packet.toBuffer(), null, false);
  }

  // _send(unitID, data, callback) {
  //   const transactionID = this._incrementTransactionCounter();
  //   if (callback != null) this._callbacks.set(transactionID, callback);

  //   const packet = new MBPacket();
  //   packet.transactionID = transactionID;
  //   packet.unitID = unitID;
  //   packet.data = data;

  //   this.send(packet.toBuffer(), null, false);
  // }

  handleData(data, info) {
    const packet = MBPacket.FromBuffer(data);

    // console.log(packet)

    if (this._callbacks.has(packet.transactionID)) {
      const resolver = this._callbacks.get(packet.transactionID);
      this._callbacks.delete(packet.transactionID);

      if (packet.reply.error) {
        resolver.reject(packet.reply.error);
      } else {
        resolver.resolve(packet.reply);
      }
    }
  }

  // handleData(data, info) {
  //   const packet = MBPacket.FromBuffer(data);

  //   console.log(packet)

  //   if (this._callbacks.has(packet.transactionID)) {
  //     this._callbacks.get(packet.transactionID)(packet.reply.error, packet.reply);
  //     this._callbacks.delete(packet.transactionID);
  //   }
  // }
}

module.exports = MBTCPLayer;
