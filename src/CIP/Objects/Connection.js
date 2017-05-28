'use strict';

// const CIPObject = require('./CIPObject');

const Queueable = require('./../../Classes/Queueable');

const ConnectionManager = require('./ConnectionManager');
const MessageRouter = require('./MessageRouter');

// class Connection extends CIPObject {
class Connection {
  constructor(layer, options) {
    this._queue = new Queueable();

    layer.addObject(this);

    this.mergeOptionsWithDefaults(options);

    this._connectionStatus = 0;

    this._sequenceCount = 0;
    this._callbacks = {};

    this.connect();
  }

  mergeOptionsWithDefaults(options) {
    if (!options) options = {};
    this.VendorID = options.VendorID || 0x1337;
    this.OriginatorSerialNumber = options.OriginatorSerialNumber || 42;
    this.ConnectionTimeoutMultiplier = options.ConnectionTimeoutMultiplier || 0x03;
    this.OToTRPI = options.OtoTRPI || 0x00201234;
    this.OtoTNetworkConnectionParameters = options.OtoTNetworkConnectionParameters || 0x43F4;
    this.TtoORPI = options.TtoORPI || 0x00204001;
    this.TtoONetworkConnectionParameters = options.TtoONetworkConnectionParameters || 0x43F4;
    this.TransportClassTrigger = options.TransportClassTrigger || 0xA3 // 0xA3: Direction = Server, Production Trigger = Application Object, Trasport Class = 3
    this.ProcessorSlot = options.ProcessorSlot || 0;
  }

  connect(callback) {
    if (this._connectionStatus > 0) return;
    let self = this;
    self._connectionStatus = 1;

    self._layer.sendUnconnected(ConnectionManager.ForwardOpen(self), function(data) {
      let message = MessageRouter.Reply(data);

      if (message.status === 0 && message.service === (ConnectionManager.Services.ForwardOpen | (1 << 7))) {
        self._connectionStatus = 2;
        let reply = ConnectionManager.ForwardOpenReply(message.data);
        self._OtoTConnectionID = reply.OtoTNetworkConnectionID;
        self._TtoOConnectionID = reply.TtoONetworkConnectionID;
        self._OtoTPacketRate = reply.OtoTActualPacketRate;
        self._TtoOPacketRate = reply.TtoOActualPacketRate;
        self._connectionSerialNumber = reply.ConnectionSerialNumber;

        self._layer.setConnectionResponseCallback(self._TtoOConnectionID, function() {
          self.handleData.apply(self, arguments);
        });

        self.sendNextMessage();
      } else {
        console.log('');
        console.log('CIP Connection Error: Status is not successful or service is not correct:');
        console.log(message);
      }

      if (callback) callback();
    });
  }

  disconnect(callback) {
    if (this._connectionStatus < 2) return;
    let self = this;
    self._connectionStatus = -1;

    self._layer.sendUnconnected(ConnectionManager.ForwardClose(self), function(data) {
      let message = MessageRouter.Reply(data);
      if (message.status === 0 && message.service === (ConnectionManager.Services.ForwardClose | (1 << 7))) {
        self._connectionStatus = 0;
        self._layer.setConnectionResponseCallback(self._TtoOConnectionID, null);
        if (callback) callback();
      }
    });
  }

  send(message, callback) {
    this._queue.addToQueue({ message: message, callback: callback}, false);
    this.sendNextMessage();
  }

  sendNextMessage() {
    if (this._connectionStatus === 2) {
      let request = this._queue.getNext();

      if (request) {

        let sequenceCount = this._incrementSequenceCount();

        let message = request.message;
        let callback = request.callback;

        if (callback) this._callbacks[sequenceCount] = callback;

        let buffer = Buffer.alloc(message.length + 2);
        buffer.writeUInt16LE(sequenceCount, 0);
        message.copy(buffer, 2);

        this._layer.sendConnected(this._OtoTConnectionID, buffer);

        this.sendNextMessage();
      }
    }
  }

  handleData(data, info) {
    // this will always be connected data
    let sequenceCount = data.readUInt16LE(0);
    let message = data.slice(2);

    if (this._callbacks[sequenceCount]) {
      let callback = this._callbacks[sequenceCount];
      delete this._callbacks[sequenceCount];
      callback(message);
    }
  }

  _incrementSequenceCount() {
    this._sequenceCount = (this._sequenceCount + 1) % 0x10000;
    return this._sequenceCount;
  }
}

module.exports = Connection;

// const ClassServices = [
//   0x08, // Create
//   0x09, // Delete
//   0x05, // Reset
//   0x11, // Find_Next_Object_Instance
//   0x0E // Get_Attribute_Single
// ];
//
// // EIP-CIP V1 3-4.3.1, pg. 3-10
// const StateDescriptions = {
//   0x00: 'Non-existent',
//   0x01: 'Configuring',
//   0x02: 'Waiting for Connection ID',
//   0x03: 'Established',
//   0x04: 'Timed Out',
//   0x05: 'Deferred Delete',
//   0x06: 'Closing'
// };
