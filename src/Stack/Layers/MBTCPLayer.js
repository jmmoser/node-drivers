'use strict';

const Layer = require('./Layer');

const Packetable = Layer.Packetable;

const MBPacket = require('./../Packets/MBPacket');

class MBTCPLayer extends Layer {
  constructor(layer) {
    super(layer);
    this._transactionCounter = 0;
    this._callbacks = {};

    this.packetable = new Packetable(MBPacket.Length, MBPacket.Length, this._handleResponse.bind(this));
  }

  _handleResponse(buffer) {
    let packet = MBPacket.FromBuffer(buffer);

    if (this._callbacks[packet.transactionID]) {
      this._callbacks[packet.transactionID](packet.reply.error, packet.reply);
      delete this._callbacks[packet.transactionID];
    }
  }

  readDiscreteInputs(unitID, address, count, callback) {
    const fn = MBPacket.Functions.ReadDiscreteInputs;
    let data = this._readRequest(fn, address, count);
    this._send(unitID, data, callback);
  }

  readCoils(unitID, address, count, callback) {
    const fn = MBPacket.Functions.ReadCoils;
    let data = this._readRequest(fn, address, count);
    this._send(unitID, data, callback);
  }

  readInputRegisters(unitID, address, count, callback) {
    const fn = MBPacket.Functions.ReadInputRegisters;
    let data = this._readRequest(fn, address, count);
    this._send(unitID, data, callback);
  }

  readHoldingRegisters(unitID, address, count, callback) {
    const fn = MBPacket.Functions.ReadHoldingRegisters;
    let data = this._readRequest(fn, address, count);
    this._send(unitID, data, callback);
  }

  writeSingleCoil(unitID, address, value, callback) {
    const fn = MBPacket.Functions.WriteSingleCoil;
    let data = this._writeRequest(fn, address, [value ? 0x00FF : 0x0000]);
    this._send(unitID, data, callback);
  }

  writeMultipleCoils(unitID, address, values, callback) {

    let byteCount = Math.ceil(values.length / 8);

    for (let i = 0; i < values.length; i++) {
      values[i] = values[i] ? 0x00FF: 0x0000;
    }
    const fn = MBPacket.Functions.WriteMultipleCoils;
    let data = this._writeRequest(fn, address, values);
    this._send(unitID, data, callback);
  }

  writeSingleRegister(unitID, address, values, callback) {
    const fn = MBPacket.Functions.WriteSingleRegister;

  }

  writeMultipleRegisters(unitID, address, values, callback) {
    const fn = MBPacket.Functions.WriteMultipleRegisters;

  }

  _readRequest(functionCode, startingAddress, count) {
    let buffer = Buffer.alloc(5);
    buffer.writeUInt8(functionCode, 0);
    buffer.writeUInt16BE(startingAddress, 1);
    buffer.writeUInt16BE(count, 3);
    return buffer;
  }

  _writeRequest(functionCode, startingAddress, values) {
    let buffer = Buffer.alloc(3 + 2 * values.length);
    buffer.writeUInt8(functionCode, 0);
    buffer.writeUInt16BE(startingAddress, 1);
    for (let i = 0; i < values.length; i++) {
      buffer.writeUInt16BE(values[i], 3 + 2 * i);
    }
    return buffer;
  }


  _incrementTransactionCounter() {
    this._transactionCounter = (this._transactionCounter + 1) % 0x10000;
    return this._transactionCounter;
  }

  _send(unitID, data, callback) {
    let transactionID = this._incrementTransactionCounter();
    if (callback) this._callbacks[transactionID] = callback;

    let packet = new MBPacket();
    packet.transactionID = transactionID;
    packet.unitID = unitID;
    packet.data = data;

    // console.log(packet.toBuffer());

    this.send(packet.toBuffer(), null, false);
  }

  handleData(data, info) {
    this.packetable.handleData(data);
  }
}

module.exports = MBTCPLayer;
