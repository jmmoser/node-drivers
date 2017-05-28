'use strict';

const MessageRouter = require('./Objects/MessageRouter');
// const CIPObject = require('./Objects/CIPObject');

const Connection = require('./Objects/Connection');

// class ControlLogix extends Connection {
class ControlLogix {
  constructor(cipLayer, options) {
    this.connection = new Connection(cipLayer, options);
  }

  ReadTag(address, callback) {
    if (!address || !callback) return;

    let path = MessageRouter.ANSIExtSymbolSegment(address);
    let data = Buffer.from([0x01, 0x00]); // number of elements to read (1)

    let request = MessageRouter.Request(Services.ReadTag, path, data);

    this.connection.send(request, function(message) {
      let reply = MessageRouter.Reply(message);
      let dataType = reply.data.readUInt16LE(0);
      let dataConverter = DataConverters[dataType];
      if (dataConverter) {
        callback(null, dataConverter(reply.data, 2));
      } else {
        callback('ControlLogix Error: No converter for data type: ' + dataType);
      }
    });
  }

  WriteTag(address, value, callback) {
    if (!address || !callback) return;

    let path = MessageRouter.ANSIExtSymbolSegment(address);
    // let data = Buffer.from([0x01, 0x00]); // number of elements to read (1)
    // let data = Buffer.from([0xC4, 0x00, 0x01, 0x00])
    let data = Buffer.alloc(8);
    data.writeUInt16LE(DataTypes.Float, 0);
    data.writeUInt16LE(1, 2);
    data.writeFloatLE(value, 4);

    let request = MessageRouter.Request(Services.WriteTag, path, data);

    this.connection.send(request, function(message) {
      let reply = MessageRouter.Reply(message);
      callback(null, reply);
    });
  }
}

module.exports = ControlLogix;


// 1756-PM020, pg. 16
const Services = {
  ReadTag: 0x4C,
  ReadTagFragmented: 0x52,
  WriteTag: 0x4D,
  WriteTagFragmented: 0x53,
  ReadModifyWriteTag: 0x4E,

  MultipleServicePacket: 0x0A // used to combine multiple requests in one message frame
};

const DataTypes = {
  Byte: 0xC1,
  Char: 0xC2,
  Short: 0xC3,
  Integer: 0xC4,
  Float: 0xCA,
  UnsignedInteger: 0xD3
}

const DataConverters = {
  0x00C1: function(buffer, offset) {
    return !!buffer.readUInt8(offset);
  },
  0x00C2: function(buffer, offset) {
    return buffer.readInt8(offset);
  },
  0x00C3: function(buffer, offset) {
    return buffer.readInt16LE(offset);
  },
  0x00C4: function(buffer, offset) {
    return buffer.readInt32(offset);
  },
  0x00CA: function(buffer, offset) {
    return buffer.readFloatLE(offset);
  },
  0x00D3: function(buffer, offset) {
    return buffer.readUInt32LE(offset);
  }
};
